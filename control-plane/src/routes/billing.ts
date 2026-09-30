import { Router, Response } from 'express';
import { auth, AuthenticatedRequest } from '../middleware/auth.js';
import { getOrgUsageSummary } from '../services/usage.js';
import { db } from '../services/db.js';

export const billingRouter = Router();

// GET /v1/orgs/:id/usage or /v1/billing/orgs/:id/usage
billingRouter.get('/orgs/:id/usage', auth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.params.id;
    const membership = await db.orgMember.findFirst({
      where: {
        orgId,
        user: {
          OR: [
            { id: req.userId },
            { githubId: req.userId }
          ]
        }
      }
    });

    if (!membership) {
      // If user isn't in this org, check if user owns any org or 403
      res.status(403).json({ error: 'Access denied to organization billing' });
      return;
    }

    const summary = await getOrgUsageSummary(orgId);
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal error' });
  }
});

// Mock upgrade / checkout endpoint: POST /v1/billing/orgs/:id/upgrade
billingRouter.post('/orgs/:id/upgrade', auth as any, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.params.id;
    const plan = (req.body.plan || 'pro').toLowerCase();

    const updated = await db.organization.update({
      where: { id: orgId },
      data: { plan }
    });

    res.json({
      success: true,
      orgId: updated.id,
      plan: updated.plan,
      message: `Organization plan upgraded to ${updated.plan.toUpperCase()}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Upgrade failed' });
  }
});

// Stripe webhook handler
billingRouter.post('/webhook', async (req, res) => {
  try {
    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventType = event.type;
    const object = event.data?.object;

    if (eventType === 'customer.subscription.created' || eventType === 'customer.subscription.updated') {
      const customerId = object.customer;
      const status = object.status;
      const plan = status === 'active' ? 'pro' : 'free';

      if (customerId) {
        await db.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: { plan }
        });
      }
    } else if (eventType === 'customer.subscription.deleted') {
      const customerId = object.customer;
      if (customerId) {
        await db.organization.updateMany({
          where: { stripeCustomerId: customerId },
          data: { plan: 'free' }
        });
      }
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Error in billing webhook:', error);
    res.status(400).json({ error: 'Webhook handler error' });
  }
});
