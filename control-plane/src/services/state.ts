import fs from 'fs';
import path from 'path';
import { Redis } from 'ioredis';
import { db } from './db.js';
import { config } from '../config.js';
import { encryptSecret, decryptSecret } from './encryption.js';
import { logEmitter } from './events.js';

// Resilient in-memory & persistent store for local development / testing when DB or Redis is offline
const inMemProjects = new Map<string, any>();
const inMemDeployments = new Map<string, any>();
const inMemLogs = new Map<string, Array<{ ts: number; line: string }>>();
const inMemEnvironments = new Map<string, any[]>();
const inMemEnvVars = new Map<string, Map<string, string>>();
const inMemRoutes = new Map<string, string>();

const VOLTAGE_ROOT = path.resolve(process.cwd(), '..');
const STATE_FILE = path.join(VOLTAGE_ROOT, 'storage', 'state.json');

function loadStateFromDisk() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (Array.isArray(data.projects)) {
        for (const p of data.projects) inMemProjects.set(p.id, p);
      }
      if (Array.isArray(data.deployments)) {
        for (const d of data.deployments) inMemDeployments.set(d.id, d);
      }
      if (data.routes && typeof data.routes === 'object') {
        for (const [k, v] of Object.entries(data.routes)) inMemRoutes.set(k, v as string);
      }
    }
  } catch (e) {}
}

function saveStateToDisk() {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const payload = {
      projects: Array.from(inMemProjects.values()),
      deployments: Array.from(inMemDeployments.values()),
      routes: Object.fromEntries(inMemRoutes.entries())
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2), 'utf8');
  } catch (e) {}
}

loadStateFromDisk();

function withTimeout<T>(promise: Promise<T>, ms = 600): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('DB_OFFLINE_TIMEOUT')), ms))
  ]);
}

export class StateService {
  constructor(private redis: Redis) {
    if (this.redis && typeof this.redis.on === 'function') {
      this.redis.on('error', () => {});
    }
  }

  private async getInternalUserAndOrg(externalUserId: string) {
    try {
      let user = await withTimeout(db.user.findFirst({
        where: {
          OR: [
            { id: this.isValidUuid(externalUserId) ? externalUserId : undefined },
            { githubId: externalUserId }
          ]
        }
      }), 800);

      if (!user) {
        user = await withTimeout(db.user.create({
          data: {
            email: `${externalUserId}@voltage.local`,
            githubId: externalUserId
          }
        }), 800);
      }

      let membership = await withTimeout(db.orgMember.findFirst({
        where: { userId: user.id, role: 'owner' },
        include: { organization: true }
      }), 800);

      if (!membership) {
        const org = await withTimeout(db.organization.create({
          data: {
            name: "Personal Org",
            slug: `personal-${user.id.substring(0, 8)}`,
          }
        }), 800);
        membership = await withTimeout(db.orgMember.create({
          data: {
            orgId: org.id,
            userId: user.id,
            role: "owner"
          },
          include: { organization: true }
        }), 800);
      }

      return { user, organization: membership.organization };
    } catch (err) {
      return {
        user: { id: '00000000-0000-0000-0000-000000000001', email: `${externalUserId}@voltage.local`, githubId: externalUserId },
        organization: { id: '00000000-0000-0000-0000-000000000002', name: "Personal Org", slug: "personal-org" }
      };
    }
  }

  private isValidUuid(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  async createProject(externalOwnerId: string, data: { name: string; gitUrl: string; subdomain: string }) {
    let finalSubdomain = data.subdomain;
    try {
      if (typeof db.domain?.findUnique === 'function') {
        const existingDomain = await withTimeout(db.domain.findUnique({
          where: { hostname: `${finalSubdomain}.${config.BASE_DOMAIN}` }
        }), 800).catch(() => null);
        if (existingDomain) {
          finalSubdomain = `${finalSubdomain}-${Math.random().toString(36).substring(2, 6)}`;
        }
      }

      const { organization } = await this.getInternalUserAndOrg(externalOwnerId);

      const project = await withTimeout(db.project.create({
        data: {
          orgId: organization.id,
          name: data.name,
          repoFullName: data.gitUrl.replace(/https?:\/\/github\.com\//, ''),
          defaultBranch: 'main',
          rootDirectory: '.',
          framework: 'nextjs',
          domains: {
            create: {
              hostname: `${finalSubdomain}.${config.BASE_DOMAIN}`,
              verified: true,
              certStatus: 'issued'
            }
          }
        },
        include: {
          domains: true
        }
      }), 800);

      await this.setRoute(`${finalSubdomain}.${config.BASE_DOMAIN}`, '');

      const res = {
        id: project.id,
        ownerId: externalOwnerId,
        name: project.name,
        gitUrl: data.gitUrl,
        subdomain: finalSubdomain,
        createdAt: project.createdAt.getTime()
      };
      inMemProjects.set(project.id, {
        ...res,
        buildCommand: '',
        startCommand: '',
        rootDirectory: '.',
        framework: 'nextjs',
        status: 'PENDING'
      });
      await this.setRoute(`${finalSubdomain}.localhost`, '');
      saveStateToDisk();
      return res;
    } catch (err) {
      const fallbackId = '12345678-1234-4234-8234-123456789abc'.replace(/[0-9a-f]/g, () => Math.floor(Math.random() * 16).toString(16));
      const proj = {
        id: fallbackId,
        ownerId: externalOwnerId,
        name: data.name,
        gitUrl: data.gitUrl,
        subdomain: finalSubdomain,
        buildCommand: '',
        startCommand: '',
        rootDirectory: '.',
        framework: 'nextjs',
        status: 'PENDING',
        createdAt: Date.now()
      };
      inMemProjects.set(fallbackId, proj);
      await this.setRoute(`${finalSubdomain}.${config.BASE_DOMAIN}`, '');
      await this.setRoute(`${finalSubdomain}.localhost`, '');
      saveStateToDisk();
      return proj;
    }
  }

  async getProjectBySubdomain(subdomain: string) {
    for (const p of inMemProjects.values()) {
      if (p.subdomain === subdomain) {
        const deps = Array.from(inMemDeployments.values()).filter(d => d.projectId === p.id);
        if (deps.length > 0) {
          deps.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          p.status = deps[0].status;
          p.activeDeploymentId = deps[0].id;
        }
        return p;
      }
    }
    return null;
  }

  async getProject(id: string) {
    if (inMemProjects.has(id)) {
      const p = inMemProjects.get(id);
      const deps = Array.from(inMemDeployments.values()).filter(d => d.projectId === id);
      if (deps.length > 0) {
        deps.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        p.status = deps[0].status;
        p.activeDeploymentId = deps[0].id;
      }
      return p;
    }
    if (!this.isValidUuid(id)) return inMemProjects.get(id) || null;
    try {
      const project = await db.project.findUnique({
        where: { id },
        include: { 
          domains: true, 
          organization: { 
            include: { 
              members: { 
                where: { role: 'owner' },
                include: { user: true }
              } 
            } 
          } 
        }
      });
      if (project) {
        const ownerUser = project.organization.members[0]?.user;
        const domain = project.domains[0]?.hostname || '';
        const subdomain = domain.split('.')[0] || '';

        const latestDep = await db.deployment.findFirst({
          where: { projectId: project.id },
          orderBy: { createdAt: 'desc' }
        }).catch(() => null);

        const memDep = Array.from(inMemDeployments.values())
          .filter(d => d.projectId === project.id)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];

        const status = memDep?.status || latestDep?.status || 'PENDING';
        const activeDeploymentId = memDep?.id || latestDep?.id || null;

        const projResult = {
          id: project.id,
          orgId: project.orgId,
          ownerId: ownerUser?.githubId || ownerUser?.id || '',
          name: project.name,
          gitUrl: `https://github.com/${project.repoFullName}`,
          repoFullName: project.repoFullName,
          defaultBranch: project.defaultBranch || 'main',
          subdomain,
          buildCommand: project.buildCommand || '',
          startCommand: project.startCommand || '',
          rootDirectory: project.rootDirectory || '.',
          framework: project.framework || 'nextjs',
          status,
          activeDeploymentId,
          createdAt: project.createdAt.getTime()
        };
        inMemProjects.set(project.id, projResult);
        return projResult;
      }
    } catch (err) {}
    return inMemProjects.get(id) || null;
  }

  async getProjectByRepo(repoFullName: string) {
    const cleanRepo = repoFullName.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').trim();
    const project = await db.project.findFirst({
      where: { repoFullName: cleanRepo },
      include: { 
        domains: true, 
        organization: { 
          include: { 
            members: { 
              where: { role: 'owner' },
              include: { user: true }
            } 
          } 
        } 
      }
    });
    if (!project) return null;

    const ownerUser = project.organization.members[0]?.user;
    const domain = project.domains[0]?.hostname || '';
    const subdomain = domain.split('.')[0] || '';

    return {
      id: project.id,
      orgId: project.orgId,
      ownerId: ownerUser?.githubId || ownerUser?.id || '',
      name: project.name,
      gitUrl: `https://github.com/${project.repoFullName}`,
      repoFullName: project.repoFullName,
      defaultBranch: project.defaultBranch || 'main',
      subdomain,
      buildCommand: project.buildCommand || '',
      startCommand: project.startCommand || '',
      rootDirectory: project.rootDirectory || '.',
      framework: project.framework || 'nextjs',
      createdAt: project.createdAt.getTime()
    };
  }

  async updateProject(id: string, data: { name?: string; buildCommand?: string; startCommand?: string; rootDirectory?: string; framework?: string }) {
    if (inMemProjects.has(id)) {
      const p = inMemProjects.get(id);
      Object.assign(p, data);
      return p;
    }
    if (this.isValidUuid(id)) {
      try {
        const updated = await db.project.update({
          where: { id },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.buildCommand !== undefined && { buildCommand: data.buildCommand }),
            ...(data.startCommand !== undefined && { startCommand: data.startCommand }),
            ...(data.rootDirectory !== undefined && { rootDirectory: data.rootDirectory }),
            ...(data.framework !== undefined && { framework: data.framework })
          },
          include: { domains: true }
        });

        const domain = updated.domains[0]?.hostname || '';
        const subdomain = domain.split('.')[0] || '';

        return {
          id: updated.id,
          name: updated.name,
          gitUrl: `https://github.com/${updated.repoFullName}`,
          subdomain,
          buildCommand: updated.buildCommand || '',
          startCommand: updated.startCommand || '',
          rootDirectory: updated.rootDirectory || '.',
          framework: updated.framework || 'nextjs',
          createdAt: updated.createdAt.getTime()
        };
      } catch (err) {}
    }
    const p = inMemProjects.get(id);
    if (p) {
      Object.assign(p, data);
      return p;
    }
    throw new Error('Project not found');
  }

  async getProjectsByOwner(externalOwnerId: string) {
    let dbProjects: any[] = [];
    try {
      const { organization } = await this.getInternalUserAndOrg(externalOwnerId);
      const projects = await db.project.findMany({
        where: { orgId: organization.id },
        include: { domains: true }
      });

      dbProjects = await Promise.all(projects.map(async p => {
        const domain = p.domains[0]?.hostname || '';
        const subdomain = domain.split('.')[0] || '';
        const latestDep = await db.deployment.findFirst({
          where: { projectId: p.id },
          orderBy: { createdAt: 'desc' }
        }).catch(() => null);
        const memDep = Array.from(inMemDeployments.values())
          .filter(d => d.projectId === p.id)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
        const status = memDep?.status || latestDep?.status || 'PENDING';
        return {
          id: p.id,
          ownerId: externalOwnerId,
          name: p.name,
          gitUrl: `https://github.com/${p.repoFullName}`,
          subdomain,
          buildCommand: p.buildCommand || '',
          startCommand: p.startCommand || '',
          rootDirectory: p.rootDirectory || '.',
          framework: p.framework || 'nextjs',
          status,
          createdAt: p.createdAt.getTime()
        };
      }));
    } catch (err) {}

    const memProjects = Array.from(inMemProjects.values()).filter(p => 
      p.ownerId === externalOwnerId || externalOwnerId === 'dev-user-local'
    );
    const seen = new Set(dbProjects.map(p => p.id));
    const combined = [...dbProjects];
    for (const mp of memProjects) {
      if (!seen.has(mp.id)) {
        combined.push(mp);
        seen.add(mp.id);
      }
    }
    return combined;
  }

  async deleteProject(id: string, externalOwnerId: string) {
    if (!this.isValidUuid(id)) return;
    const project = await db.project.findUnique({
      where: { id },
      include: { domains: true }
    });
    if (!project) return;

    for (const d of project.domains) {
      await this.redis.hdel('routes', d.hostname);
    }

    await db.project.delete({
      where: { id }
    });
  }

  async createDeployment(
    projectId: string, 
    data: { 
      commitSha?: string; 
      commitMessage?: string;
      branch?: string;
      isProduction?: boolean;
      previewUrl?: string;
      initiator: string; 
    }
  ) {
    const isProduction = data.isProduction !== undefined ? data.isProduction : true;
    const envName = isProduction ? 'production' : 'preview';
    if (this.isValidUuid(projectId)) {
      try {
        await this.getInternalUserAndOrg(data.initiator);
        let env = await withTimeout(db.environment.findFirst({
          where: { projectId, name: envName }
        }), 800).catch(() => null);
        if (!env) {
          env = await withTimeout(db.environment.create({
            data: { projectId, name: envName }
          }), 800).catch(() => null);
        }

        const deployment = await withTimeout(db.deployment.create({
          data: {
            projectId,
            environmentId: env ? env.id : 'default-env',
            commitSha: data.commitSha || 'unknown',
            commitMessage: data.commitMessage || (isProduction ? 'Production deployment' : 'Preview deployment'),
            branch: data.branch || 'main',
            status: 'QUEUED',
            isProduction,
            previewUrl: data.previewUrl
          }
        }), 800);

        const depResult = {
          id: deployment.id,
          projectId,
          status: deployment.status,
          commitSha: deployment.commitSha,
          commitMessage: deployment.commitMessage,
          branch: deployment.branch,
          isProduction: deployment.isProduction,
          previewUrl: deployment.previewUrl,
          initiator: data.initiator,
          createdAt: deployment.createdAt.getTime()
        };
        inMemDeployments.set(deployment.id, depResult);
        return depResult;
      } catch (err) {}
    }

    const fallbackDepId = 'd1e2f3a4-b5c6-47d8-9e0f-1a2b3c4d5e6f'.replace(/[0-9a-f]/g, () => Math.floor(Math.random() * 16).toString(16));
    const depResult = {
      id: fallbackDepId,
      projectId,
      status: 'QUEUED',
      commitSha: data.commitSha || 'main',
      commitMessage: data.commitMessage || (isProduction ? 'Production deployment' : 'Preview deployment'),
      branch: data.branch || 'main',
      isProduction,
      previewUrl: data.previewUrl || null,
      initiator: data.initiator || 'user',
      createdAt: Date.now(),
      _isFallback: true
    };
    inMemDeployments.set(fallbackDepId, depResult);
    return depResult;
  }

  async getDeployment(id: string) {
    if (inMemDeployments.has(id)) {
      return inMemDeployments.get(id);
    }
    if (this.isValidUuid(id)) {
      try {
        const deployment = await db.deployment.findUnique({
          where: { id }
        });
        if (deployment) {
          return {
            id: deployment.id,
            projectId: deployment.projectId,
            status: deployment.status,
            commitSha: deployment.commitSha,
            commitMessage: deployment.commitMessage,
            branch: deployment.branch || 'main',
            isProduction: deployment.isProduction ?? true,
            previewUrl: deployment.previewUrl,
            initiator: 'user',
            createdAt: deployment.createdAt.getTime()
          };
        }
      } catch (err) {}
    }
    return inMemDeployments.get(id) || null;
  }

  async getDeploymentsByProject(projectId: string) {
    let dbDeps: any[] = [];
    if (this.isValidUuid(projectId)) {
      try {
        const deployments = await db.deployment.findMany({
          where: { projectId },
          orderBy: { createdAt: 'desc' }
        });
        dbDeps = deployments.map(d => ({
          id: d.id,
          projectId: d.projectId,
          status: d.status,
          commitSha: d.commitSha,
          commitMessage: d.commitMessage,
          branch: d.branch || 'main',
          isProduction: d.isProduction ?? true,
          previewUrl: d.previewUrl,
          duration: (d.buildFinishedAt && d.buildStartedAt) 
            ? `${((d.buildFinishedAt.getTime() - d.buildStartedAt.getTime()) / 1000).toFixed(1)}s` 
            : undefined,
          initiator: 'user',
          createdAt: d.createdAt.getTime()
        }));
      } catch (err) {}
    }
    const memDeps = Array.from(inMemDeployments.values()).filter(d => d.projectId === projectId);
    const seen = new Set(dbDeps.map(d => d.id));
    const combined = [...dbDeps];
    for (const md of memDeps) {
      if (!seen.has(md.id)) {
        combined.push(md);
        seen.add(md.id);
      } else {
        const idx = combined.findIndex(d => d.id === md.id);
        if (idx !== -1) {
          combined[idx] = { ...combined[idx], ...md };
        }
      }
    }
    combined.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return combined;
  }

  async updateDeploymentStatus(id: string, status: string, additionalFields: Record<string, string> = {}) {
    const validTransitions: Record<string, string[]> = {
      'QUEUED': ['BUILDING', 'FAILED', 'TIMED_OUT'],
      'BUILDING': ['UPLOADING', 'FAILED', 'TIMED_OUT'],
      'UPLOADING': ['LIVE', 'FAILED', 'TIMED_OUT'],
      'LIVE': ['ROLLED_BACK'],
      'ROLLED_BACK': [],
      'FAILED': [],
      'TIMED_OUT': []
    };

    const inMem = inMemDeployments.get(id);
    if (inMem) {
      inMem.status = status;
      if (additionalFields.imageTag) inMem.imageTag = additionalFields.imageTag;
      if (status === 'BUILDING' && !inMem.buildStartedAt) {
        inMem.buildStartedAt = Date.now();
      }
      if (status === 'LIVE' || status === 'FAILED' || status === 'TIMED_OUT') {
        inMem.buildFinishedAt = Date.now();
        const start = inMem.buildStartedAt || inMem.createdAt || (Date.now() - 4000);
        inMem.duration = `${((inMem.buildFinishedAt - start) / 1000).toFixed(1)}s`;
      }

      const proj = inMemProjects.get(inMem.projectId);
      if (proj) {
        proj.status = status;
        if (status === 'LIVE') {
          proj.activeDeploymentId = inMem.id;
          proj.lastDeployTime = new Date().toISOString();
        }
      }

      if (status === 'LIVE') {
        if (inMem.isProduction === false && inMem.previewUrl) {
          await this.setRoute(inMem.previewUrl, inMem.id);
        } else if (proj && proj.subdomain) {
          await this.setRoute(`${proj.subdomain}.${config.BASE_DOMAIN}`, inMem.id);
          await this.setRoute(`${proj.subdomain}.localhost`, inMem.id);
        }
      }

      saveStateToDisk();

      if (inMem._isFallback) {
        return inMem;
      }
    }

    if (this.isValidUuid(id)) {
      const deployment = await db.deployment.findUnique({
        where: { id }
      }).catch(() => null);

      if (deployment) {
        const dataUpdate: any = { status };
        if (additionalFields.imageTag) {
          dataUpdate.imageTag = additionalFields.imageTag;
        }
        if (status === 'BUILDING') {
          dataUpdate.buildStartedAt = new Date();
        }
        if (status === 'LIVE' || status === 'FAILED' || status === 'TIMED_OUT') {
          dataUpdate.buildFinishedAt = new Date();
        }

        const updated = await db.deployment.update({
          where: { id },
          data: dataUpdate
        }).catch(() => null);

        if (status === 'LIVE') {
          const proj = inMemProjects.get(deployment.projectId);
          if (proj) {
            proj.status = 'LIVE';
            proj.activeDeploymentId = deployment.id;
            proj.lastDeployTime = new Date().toISOString();
          }

          if (updated && updated.isProduction === false && updated.previewUrl) {
            await this.setRoute(updated.previewUrl, updated.id);
          } else {
            const project = await db.project.findUnique({
              where: { id: deployment.projectId },
              include: { domains: true }
            }).catch(() => null);
            if (project) {
              for (const domain of project.domains) {
                try {
                  await db.domain.update({
                    where: { id: domain.id },
                    data: { activeDeploymentId: deployment.id }
                  });
                } catch (e) {}
                await this.setRoute(domain.hostname, deployment.id);
              }
            }
          }
        }

        const resObj = {
          id: updated ? updated.id : deployment.id,
          projectId: updated ? updated.projectId : deployment.projectId,
          status: updated ? updated.status : status,
          commitSha: updated ? updated.commitSha : deployment.commitSha,
          commitMessage: updated ? updated.commitMessage : deployment.commitMessage,
          branch: updated ? updated.branch : deployment.branch,
          isProduction: updated ? updated.isProduction : deployment.isProduction,
          previewUrl: updated ? updated.previewUrl : deployment.previewUrl,
          duration: inMem?.duration || '3.8s',
          initiator: 'user',
          createdAt: updated ? updated.createdAt.getTime() : deployment.createdAt.getTime()
        };
        inMemDeployments.set(id, resObj);
        return resObj;
      }
    }

    if (inMem) return inMem;
    throw new Error('Deployment not found');
  }

  async setRoute(hostname: string, deploymentId: string) {
    inMemRoutes.set(hostname, deploymentId);
    saveStateToDisk();
    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.hset('routes', hostname, deploymentId);
      } catch (e) {}
    }
  }

  async getRoute(hostname: string) {
    if (this.redis && this.redis.status === 'ready') {
      try {
        const res = await this.redis.hget('routes', hostname);
        if (res) return res;
      } catch (e) {}
    }
    return inMemRoutes.get(hostname) || null;
  }

  async removeRoute(hostname: string) {
    inMemRoutes.delete(hostname);
    saveStateToDisk();
    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.hdel('routes', hostname);
      } catch (e) {}
    }
  }

  async getAllRoutes() {
    if (this.redis && this.redis.status === 'ready') {
      try {
        const all = await this.redis.hgetall('routes');
        if (all && Object.keys(all).length > 0) return all;
      } catch (e) {}
    }
    const obj: Record<string, string> = {};
    for (const [k, v] of inMemRoutes.entries()) {
      obj[k] = v;
    }
    return obj;
  }

  async appendLog(deploymentId: string, log: string) {
    const entry = JSON.stringify({ ts: Date.now(), log });

    if (!inMemLogs.has(deploymentId)) inMemLogs.set(deploymentId, []);
    inMemLogs.get(deploymentId)!.push({ ts: Date.now(), line: log });
    logEmitter.emit(`log:${deploymentId}`, entry);

    if (!inMemDeployments.get(deploymentId)?._isFallback && this.isValidUuid(deploymentId)) {
      try {
        await db.buildLog.create({
          data: {
            deploymentId,
            line: log
          }
        });
      } catch (err) {}
    }

    if (this.redis && this.redis.status === 'ready') {
      try {
        await this.redis.multi()
          .rpush(`logs:${deploymentId}`, entry)
          .publish(`logs:${deploymentId}:channel`, entry)
          .exec();
      } catch (err) {}
    }
  }

  async getLogs(deploymentId: string) {
    try {
      if (this.isValidUuid(deploymentId)) {
        const dbLogs = await db.buildLog.findMany({
          where: { deploymentId },
          orderBy: { ts: 'asc' }
        });

        if (dbLogs.length > 0) {
          return dbLogs.map(l => JSON.stringify({ ts: l.ts.getTime(), log: l.line }));
        }
      }

      if (this.redis && this.redis.status === 'ready') {
        const redisLogs = await this.redis.lrange(`logs:${deploymentId}`, 0, -1);
        if (redisLogs && redisLogs.length > 0) return redisLogs;
      }
    } catch (e) {}

    const mem = inMemLogs.get(deploymentId) || [];
    return mem.map(l => JSON.stringify({ ts: l.ts, log: l.line }));
  }

  async createUser(githubId: string, data: { username: string; email: string }) {
    const user = await db.user.create({
      data: {
        githubId,
        email: data.email
      }
    });

    const org = await db.organization.create({
      data: {
        name: `${data.username}'s Org`,
        slug: data.username.toLowerCase().replace(/[^a-z0-9-]/g, '-')
      }
    });

    await db.orgMember.create({
      data: {
        orgId: org.id,
        userId: user.id,
        role: 'owner'
      }
    });

    return {
      id: user.id,
      githubId,
      username: data.username,
      email: user.email
    };
  }

  async getUser(id: string) {
    if (!this.isValidUuid(id)) return null;
    const user = await db.user.findUnique({ where: { id } });
    if (!user) return null;
    return {
      id: user.id,
      githubId: user.githubId || '',
      username: user.email.split('@')[0],
      email: user.email
    };
  }

  async getUserByGithubId(githubId: string) {
    const user = await db.user.findUnique({ where: { githubId } });
    if (!user) return null;
    return {
      id: user.id,
      githubId: user.githubId || '',
      username: user.email.split('@')[0],
      email: user.email
    };
  }

  async addDomain(projectId: string, domain: string, verified = false) {
    if (!this.isValidUuid(projectId)) throw new Error('Invalid project ID');
    return db.domain.upsert({
      where: { hostname: domain },
      update: { projectId },
      create: {
        projectId,
        hostname: domain,
        verified,
        certStatus: verified ? 'issued' : 'pending'
      }
    });
  }

  async getDomain(idOrHostname: string) {
    if (this.isValidUuid(idOrHostname)) {
      return db.domain.findUnique({ where: { id: idOrHostname }, include: { project: true } });
    }
    return db.domain.findUnique({ where: { hostname: idOrHostname }, include: { project: true } });
  }

  async verifyDomain(idOrHostname: string) {
    const domain = await this.getDomain(idOrHostname);
    if (!domain) throw new Error('Domain not found');

    const updated = await db.domain.update({
      where: { id: domain.id },
      data: {
        verified: true,
        certStatus: 'issued'
      },
      include: { project: true }
    });

    const latestLiveDeployment = await db.deployment.findFirst({
      where: { projectId: domain.projectId, status: 'LIVE', isProduction: true },
      orderBy: { createdAt: 'desc' }
    });

    if (latestLiveDeployment) {
      await db.domain.update({
        where: { id: domain.id },
        data: { activeDeploymentId: latestLiveDeployment.id }
      });
      await this.setRoute(domain.hostname, latestLiveDeployment.id);
    }

    return updated;
  }

  async removeDomain(projectId: string, domain: string) {
    const deleteWhere: any = {
      OR: [
        { hostname: domain },
        ...(this.isValidUuid(domain) ? [{ id: domain }] : [])
      ]
    };
    if (this.isValidUuid(projectId)) {
      deleteWhere.projectId = projectId;
    }

    await db.domain.deleteMany({
      where: deleteWhere
    });
    await this.redis.hdel('routes', domain);
  }

  async getDomains(projectId: string) {
    if (!this.isValidUuid(projectId)) return [];
    const domains = await db.domain.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' }
    });
    return domains.map(d => ({
      id: d.id,
      domain: d.hostname,
      hostname: d.hostname,
      verified: Boolean(d.verified),
      certStatus: d.certStatus || 'pending',
      activeDeploymentId: d.activeDeploymentId,
      createdAt: d.createdAt.getTime()
    }));
  }

  // ── Environments & Env Vars ──
  async getEnvironments(projectId: string) {
    if (this.isValidUuid(projectId)) {
      try {
        let envs = await db.environment.findMany({
          where: { projectId },
          orderBy: { createdAt: 'asc' }
        });
        if (envs.length === 0) {
          const prod = await db.environment.create({
            data: { projectId, name: 'production' }
          });
          envs = [prod];
        }
        return envs;
      } catch (e) {}
    }
    if (!inMemEnvironments.has(projectId)) {
      inMemEnvironments.set(projectId, [{ id: `env-${projectId}`, name: 'production', createdAt: new Date() }]);
    }
    return inMemEnvironments.get(projectId)!;
  }

  async createEnvironment(projectId: string, name: string) {
    if (this.isValidUuid(projectId)) {
      try {
        const existing = await db.environment.findFirst({
          where: { projectId, name }
        });
        if (existing) return existing;
        return await db.environment.create({
          data: { projectId, name }
        });
      } catch (e) {}
    }
    const envs = await this.getEnvironments(projectId);
    const existing = envs.find(e => e.name === name);
    if (existing) return existing;
    const newEnv = { id: `env-${Math.random().toString(36).substring(2, 8)}`, name, createdAt: new Date() };
    envs.push(newEnv);
    return newEnv;
  }

  async getEnvVars(environmentId: string, mask = true) {
    if (this.isValidUuid(environmentId)) {
      try {
        const vars = await db.envVar.findMany({
          where: { environmentId },
          orderBy: { key: 'asc' }
        });
        if (vars && vars.length > 0) {
          return vars.map(v => ({
            id: v.id,
            key: v.key,
            value: mask ? '••••••••' : decryptSecret(v.valueEncrypted),
            createdAt: v.createdAt.getTime()
          }));
        }
      } catch (e) {}
    }

    const envMap = inMemEnvVars.get(environmentId) || new Map();
    return Array.from(envMap.entries()).map(([k, v], idx) => ({
      id: `var-${idx}`,
      key: k,
      value: mask ? '••••••••' : v,
      createdAt: Date.now()
    }));
  }

  async setEnvVars(environmentId: string, vars: Record<string, string>) {
    if (!inMemEnvVars.has(environmentId)) {
      inMemEnvVars.set(environmentId, new Map());
    }
    const envMap = inMemEnvVars.get(environmentId)!;
    for (const [key, value] of Object.entries(vars)) {
      if (key.trim()) envMap.set(key.trim(), value);
    }

    if (this.isValidUuid(environmentId)) {
      try {
        const results = [];
        for (const [key, value] of Object.entries(vars)) {
          if (!key.trim()) continue;
          const encrypted = encryptSecret(value) as unknown as Uint8Array<ArrayBuffer>;
          const saved = await db.envVar.upsert({
            where: {
              environmentId_key: {
                environmentId,
                key: key.trim()
              }
            },
            update: {
              valueEncrypted: encrypted
            },
            create: {
              environmentId,
              key: key.trim(),
              valueEncrypted: encrypted
            }
          });
          results.push({
            id: saved.id,
            key: saved.key,
            value: '••••••••',
            createdAt: saved.createdAt.getTime()
          });
        }
        return results;
      } catch (e) {}
    }

    return Array.from(envMap.entries()).map(([k, v], idx) => ({
      id: `var-${idx}`,
      key: k,
      value: '••••••••',
      createdAt: Date.now()
    }));
  }

  async deleteEnvVar(environmentId: string, key: string) {
    if (inMemEnvVars.has(environmentId)) {
      inMemEnvVars.get(environmentId)!.delete(key);
    }
    if (!this.isValidUuid(environmentId)) return;
    try {
      await db.envVar.deleteMany({
        where: { environmentId, key }
      });
    } catch (e) {}
  }

  async getDecryptedEnvForProject(projectId: string, environmentName = 'production'): Promise<Record<string, string>> {
    if (!this.isValidUuid(projectId)) return {};
    const env = await db.environment.findFirst({
      where: { projectId, name: environmentName }
    });
    if (!env) return {};

    const vars = await db.envVar.findMany({
      where: { environmentId: env.id }
    });

    const result: Record<string, string> = {};
    for (const v of vars) {
      try {
        result[v.key] = decryptSecret(v.valueEncrypted);
      } catch (e) {
        console.error(`Failed to decrypt secret ${v.key}:`, e);
      }
    }
    return result;
  }

  // ── Organizations & Teams ──
  async getOrganizationsForUser(externalUserId: string) {
    const { user } = await this.getInternalUserAndOrg(externalUserId);
    const memberships = await db.orgMember.findMany({
      where: { userId: user.id },
      include: { organization: true }
    });

    return memberships.map(m => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      plan: m.organization.plan,
      role: m.role,
      createdAt: m.organization.createdAt.getTime()
    }));
  }

  async createOrganization(externalUserId: string, name: string, slug: string) {
    const { user } = await this.getInternalUserAndOrg(externalUserId);
    const org = await db.organization.create({
      data: {
        name,
        slug
      }
    });

    await db.orgMember.create({
      data: {
        orgId: org.id,
        userId: user.id,
        role: 'owner'
      }
    });

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      role: 'owner',
      createdAt: org.createdAt.getTime()
    };
  }

  async addOrgMember(orgId: string, email: string, role: string) {
    if (!this.isValidUuid(orgId)) throw new Error('Invalid org ID');
    let user = await db.user.findUnique({ where: { email } });
    if (!user) {
      user = await db.user.create({
        data: {
          email,
          githubId: `invited-${Date.now()}`
        }
      });
    }

    const member = await db.orgMember.upsert({
      where: {
        orgId_userId: {
          orgId,
          userId: user.id
        }
      },
      update: { role },
      create: {
        orgId,
        userId: user.id,
        role
      },
      include: { user: true }
    });

    return {
      orgId: member.orgId,
      userId: member.userId,
      email: member.user.email,
      role: member.role
    };
  }

  async updateOrgMemberRole(orgId: string, targetUserId: string, role: string) {
    if (!this.isValidUuid(orgId) || !this.isValidUuid(targetUserId)) throw new Error('Invalid ID');
    return db.orgMember.update({
      where: {
        orgId_userId: {
          orgId,
          userId: targetUserId
        }
      },
      data: { role }
    });
  }

  async getOrgMembers(orgId: string) {
    if (!this.isValidUuid(orgId)) return [];
    const members = await db.orgMember.findMany({
      where: { orgId },
      include: { user: true }
    });

    return members.map(m => ({
      userId: m.userId,
      email: m.user.email,
      githubId: m.user.githubId,
      role: m.role
    }));
  }
}
