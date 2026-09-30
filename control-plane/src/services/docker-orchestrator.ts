import Docker from 'dockerode';
import { StateService } from './state.js';
import { config } from '../config.js';
import { recordUsage } from './usage.js';
import { Redis } from 'ioredis';
import stream from 'stream';

const docker = new Docker();
const redis = new Redis(config.REDIS_URL);
const state = new StateService(redis);

export async function runBuild(job: { id: string; data: { deploymentId: string; gitUrl: string; projectId: string } }) {
  const { deploymentId, gitUrl, projectId } = job.data;
  const buildStartTime = Date.now();
  
  await state.updateDeploymentStatus(deploymentId, 'BUILDING');

  // Load project custom build settings and decrypted environment variables
  const project = await state.getProject(projectId).catch(() => null);
  const deployment = await state.getDeployment(deploymentId).catch(() => null);
  const envName = deployment?.isProduction === false ? 'preview' : 'production';
  const userEnvVars = await state.getDecryptedEnvForProject(projectId, envName).catch(() => ({}));
  
  const containerEnv = [
    `GIT_URL=${gitUrl}`,
    `DEPLOYMENT_ID=${deploymentId}`,
    `PROJECT_ID=${projectId}`,
    `S3_ENDPOINT=${config.S3_ENDPOINT || ''}`,
    `S3_BUCKET=${config.S3_BUCKET || ''}`,
    `AWS_ACCESS_KEY_ID=${config.S3_ACCESS_KEY || ''}`,
    `AWS_SECRET_ACCESS_KEY=${config.S3_SECRET_KEY || ''}`,
    `S3_REGION=${config.S3_REGION || 'us-east-1'}`,
    `IS_PREVIEW=${deployment?.isProduction === false}`,
    ...(deployment?.previewUrl ? [`PREVIEW_URL=${deployment.previewUrl}`] : []),
    ...(project?.buildCommand ? [`BUILD_COMMAND=${project.buildCommand}`] : []),
    ...(project?.rootDirectory && project.rootDirectory !== '.' ? [`PROJECT_SUBDIR=${project.rootDirectory}`] : []),
    ...Object.entries(userEnvVars).map(([k, v]) => `${k}=${v}`)
  ];
  
  const container = await docker.createContainer({
    Image: config.BUILDER_IMAGE,
    Tty: false,
    Env: containerEnv,
    HostConfig: {
      AutoRemove: false,
      Memory: config.BUILD_MEMORY_MB * 1024 * 1024,
      MemorySwap: config.BUILD_MEMORY_MB * 1024 * 1024,
      NanoCpus: config.BUILD_CPU_CORES * 1000000000,
      PidsLimit: 256,
      CapDrop: ['ALL'],
      SecurityOpt: ['no-new-privileges:true'],
      OomKillDisable: false
    }
  });

  let timeoutId: NodeJS.Timeout;

  try {
    const logStream = new stream.PassThrough();
    logStream.on('data', (chunk) => {
      const lines = chunk.toString('utf8').split('\n');
      for (const line of lines) {
        if (!line) continue;
        state.appendLog(deploymentId, line).catch(()=>{});
        if (line.includes('[STAGE] UPLOADING')) {
           state.updateDeploymentStatus(deploymentId, 'UPLOADING').catch(()=>{});
        }
      }
    });

    const attachStream = await container.attach({ stream: true, stdout: true, stderr: true });
    docker.modem.demuxStream(attachStream, logStream, logStream);
    
    await container.start();
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('BUILD_TIMEOUT')), config.BUILD_TIMEOUT_MS);
    });

    const waitPromise = container.wait();
    
    const result = await Promise.race([waitPromise, timeoutPromise]);
    
    if (result.StatusCode === 137) {
      throw new Error('OOM_KILL');
    } else if (result.StatusCode !== 0) {
      throw new Error(`BUILD_FAILED_CODE_${result.StatusCode}`);
    }
    
  } catch (error: any) {
    if (error.message === 'BUILD_TIMEOUT') {
      try { await container.kill(); } catch(e) {}
      throw error;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId!);
    try { await container.remove({ force: true }); } catch (e) {}
    
    // Record build duration usage
    try {
      const elapsedMinutes = Math.max(0.01, (Date.now() - buildStartTime) / 60000);
      const roundedMinutes = Math.round(elapsedMinutes * 100) / 100;
      await recordUsage(project?.orgId || null, projectId, 'build_minutes', roundedMinutes);
    } catch (err) {
      console.error('Failed to record build usage event:', err);
    }
  }
}
