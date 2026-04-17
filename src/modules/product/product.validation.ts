import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { NewProduct } from './product.interfaces';

const createProductBody: Record<keyof NewProduct, any> = {
  name: Joi.string().required(),
  description: Joi.string().required(),
  price: Joi.number().required().min(0),
  category: Joi.string().required(),
  stock: Joi.number().integer().min(0).default(0),
};

export const createProduct = {
  body: Joi.object().keys(createProductBody),
};

export const getProducts = {
  query: Joi.object().keys({
    category: Joi.string(),
    sortBy: Joi.string(),
    projectBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export const getProduct = {
  params: Joi.object().keys({
    productId: Joi.string().custom(objectId),
  }),
};

export const updateProduct = {
  params: Joi.object().keys({
    productId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      description: Joi.string(),
      price: Joi.number().min(0),
      category: Joi.string(),
      stock: Joi.number().integer().min(0),
    })
    .min(1), // Al menos un campo requerido para el PATCH
};

export const deleteProduct = {
  params: Joi.object().keys({
    productId: Joi.string().custom(objectId),
  }),
};