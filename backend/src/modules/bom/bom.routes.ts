import { Router } from 'express';
import { bomController } from './bom.controller';
import { authenticate } from '../../middleware/authenticate';
import { resolveTenantContext } from '../../middleware/tenant-context';
import { authorize, requireFeature } from '../../middleware/authorize';

const router = Router();

// All routes require authentication & active tenant context & BOM plan entitlement
router.use(authenticate);
router.use(resolveTenantContext);
router.use(requireFeature('BOM_ASSEMBLIES'));

// Read: All authenticated tenant roles can view assemblies
router.get('/', bomController.listAssemblies);
router.get('/:id', bomController.getAssemblyById);

// Write: Require ORG_ADMIN, ADMIN, or WAREHOUSE
router.post('/', authorize(['ORG_ADMIN', 'ADMIN', 'WAREHOUSE']), bomController.createAssembly);
router.put('/:id', authorize(['ORG_ADMIN', 'ADMIN', 'WAREHOUSE']), bomController.updateAssembly);
router.delete('/:id', authorize(['ORG_ADMIN', 'ADMIN']), bomController.deleteAssembly);

// Build Run execution: Require ORG_ADMIN, ADMIN, or WAREHOUSE
router.post('/:id/build', authorize(['ORG_ADMIN', 'ADMIN', 'WAREHOUSE']), bomController.buildAssembly);

export { router as bomRouter };
