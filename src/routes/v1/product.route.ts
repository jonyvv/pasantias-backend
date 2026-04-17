import express, { Router } from 'express';
import { validate } from '../../modules/validate';
import { auth } from '../../modules/auth';
import { productController, productValidation } from '../../modules/product';

const router: Router = express.Router();

router
  .route('/')
  // auth() sin argumentos = solo verifica token, cualquier rol puede ver
  .get(auth(), validate(productValidation.getProducts), productController.getProducts)
  // 'manageProducts' = solo admins
  .post(auth('manageProducts'), validate(productValidation.createProduct), productController.createProduct);

router
  .route('/:productId')
  .get(auth(), validate(productValidation.getProduct), productController.getProduct)
  .patch(auth('manageProducts'), validate(productValidation.updateProduct), productController.updateProduct)
  .delete(auth('manageProducts'), validate(productValidation.deleteProduct), productController.deleteProduct);

export default router;