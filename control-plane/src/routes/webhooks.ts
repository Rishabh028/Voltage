import { Router } from 'express';
import { verifyGitHubSignature } from '../services/webhook.js';
import { config } from '../config.js';
import { StateService } from '../services/state.js';
import { addBuildJob } from '../services/queue.js';
import { Redis } from 'ioredis';

export const webhookRouter = Router();
const redis = new Redis(config.REDIS_URL);
const state = new StateService(redis);

webhookRouter.post('/github', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const event = req.headers['x-github-event'] as string;
  
  if (!signature) {
    res.status(401).send('Missing signature');
    return;
  }
  
  if (!verifyGitHubSignature(req.body, signature, config.GITHUB_WEBHOOK_SECRET)) {
    res.status(401).send('Invalid signature');
    return;
  }
  
  if (event !== 'push' && event !== 'pull_request') {
    res.status(200).send('Ignored event');
    return;
  }

  try {
    const rawPayload = typeof req.body === 'string' ? req.body : req.body.toString('utf8');
    const payload = JSON.parse(rawPayload);
    const repoFullName = payload.repository?.full_name;

    if (!repoFullName) {
      res.status(400).json({ error: 'Missing repository in payload' });
      return;
    }

    const project = await state.getProjectByRepo(repoFullName);
    if (!project) {
      res.status(200).json({ status: 'ignored', reason: 'No project configured for repository' });
      return;
    }

    if (event === 'push') {
      const ref = payload.ref || '';
      const branch = ref.replace(/^refs\/heads\//, '');
      const commitSha = payload.after || payload.head_commit?.id || 'unknown';
      const commitMessage = payload.head_commit?.message || `Push to ${branch}`;

      // Only trigger production build if push is to project's default branch
      if (branch === project.defaultBranch) {
        const deployment = await state.createDeployment(project.id, {
          commitSha,
          commitMessage,
          branch,
          isProduction: true,
          initiator: `github-push:${payload.pusher?.name || 'webhook'}`
        });

        await addBuildJob({
          deploymentId: deployment.id,
          gitUrl: project.gitUrl,
          projectId: project.id
        });

        res.status(200).json({
          status: 'queued',
          deploymentId: deployment.id,
          isProduction: true,
          branch
        });
        return;
      } else {
        res.status(200).json({
          status: 'ignored',
          reason: `Pushed branch ${branch} is not default branch (${project.defaultBranch})`
        });
        return;
      }
    }

    if (event === 'pull_request') {
      const action = payload.action;
      const prNumber = payload.pull_request?.number || payload.number;
      const previewHostname = `${project.subdomain}-pr-${prNumber}.${config.BASE_DOMAIN}`;

      if (action === 'opened' || action === 'synchronize' || action === 'reopened') {
        const commitSha = payload.pull_request?.head?.sha || 'unknown';
        const branch = payload.pull_request?.head?.ref || `pr-${prNumber}`;
        const commitMessage = payload.pull_request?.title || `PR #${prNumber}`;

        const deployment = await state.createDeployment(project.id, {
          commitSha,
          commitMessage,
          branch,
          isProduction: false,
          previewUrl: previewHostname,
          initiator: `github-pr:${payload.sender?.login || 'webhook'}`
        });

        await addBuildJob({
          deploymentId: deployment.id,
          gitUrl: project.gitUrl,
          projectId: project.id
        });

        res.status(200).json({
          status: 'queued',
          deploymentId: deployment.id,
          isProduction: false,
          previewUrl: previewHostname,
          prNumber
        });
        return;
      } else if (action === 'closed') {
        await state.removeRoute(previewHostname);
        res.status(200).json({
          status: 'closed',
          previewUrl: previewHostname,
          prNumber
        });
        return;
      } else {
        res.status(200).json({
          status: 'ignored',
          reason: `Ignored pull_request action: ${action}`
        });
        return;
      }
    }
  } catch (e: any) {
    console.error('Error processing GitHub webhook:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
