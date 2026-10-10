import { Router, type Request } from 'express';
import { currentUser, requirePermission } from '../auth/auth.middleware.ts';
import { badRequest } from '../shared/http-error.ts';
import { asObject, readString } from '../shared/input.ts';
import {
  parseApplicationDataInput,
  parseDecisionRequest,
  parseListQuery,
  parseSensitiveFieldRef,
  parseVersion,
} from './application-input.parser.ts';
import type { ApplicationsService } from './applications.service.ts';

/** HTTP layer only: parse input, call the service, send the result. Rules live in the service. */
export function createApplicationsRouter(service: ApplicationsService): Router {
  const router = Router();

  router.get('/', (req, res) => {
    res.json(service.list(currentUser(res), parseListQuery(req.query)));
  });

  router.post('/', requirePermission('application:create'), (req, res) => {
    const body = asObject(req.body, 'body');
    res.status(201).json(service.create(currentUser(res), parseApplicationDataInput(body['data'])));
  });

  router.get('/counts', (_req, res) => {
    res.json(service.statusCounts(currentUser(res)));
  });

  router.get('/:id', (req, res) => {
    res.json(service.get(currentUser(res), idParam(req)));
  });

  router.put('/:id', requirePermission('application:edit'), (req, res) => {
    const body = asObject(req.body, 'body');
    const data = parseApplicationDataInput(body['data']);
    res.json(service.saveDraft(currentUser(res), idParam(req), parseVersion(body), data));
  });

  router.post('/:id/submit', requirePermission('application:submit'), (req, res) => {
    res.json(service.submit(currentUser(res), idParam(req)));
  });

  router.post('/:id/assignment', requirePermission('application:assign'), (req, res) => {
    const reviewerId = readString(asObject(req.body, 'body'), 'reviewerId', 'body', 64);
    if (!reviewerId) {
      throw badRequest('body.reviewerId is required');
    }
    res.json(service.assign(currentUser(res), idParam(req), reviewerId));
  });

  router.post('/:id/decision', requirePermission('application:review'), (req, res) => {
    res.json(service.decide(currentUser(res), idParam(req), parseDecisionRequest(req.body)));
  });

  router.post('/:id/sensitive/reveal', requirePermission('sensitive:reveal'), (req, res) => {
    const target = parseSensitiveFieldRef(req.body);
    res.json(service.reveal(currentUser(res), idParam(req), target));
  });

  return router;
}

function idParam(req: Request): string {
  const id = req.params['id'];
  if (typeof id !== 'string' || !id) {
    throw badRequest('Missing application id');
  }
  return id;
}
