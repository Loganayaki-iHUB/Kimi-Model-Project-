import { Router } from 'express';
import { GenerationController } from '../controllers/generation.controller';

const router = Router();

router.get('/health', GenerationController.checkHealth);
router.post('/generate', GenerationController.generate);

export default router;

