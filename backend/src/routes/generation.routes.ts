import { Router } from "express";
import { GenerationController } from "../controllers/generation.controller";

const router = Router();

router.get("/health", GenerationController.checkHealth);
// Legacy direct generation is retired: every Studio build needs an approved plan.
router.post("/generate", (_req, res) => {
  res
    .status(410)
    .json({
      success: false,
      error:
        "Direct generation has been replaced by the Studio workflow. Create a project, review its plan, then explicitly approve the build.",
    });
});

export default router;
