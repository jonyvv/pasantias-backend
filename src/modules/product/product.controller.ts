import httpStatus from 'http-status';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import catchAsync from '../utils/catchAsync';
import ApiError from '../errors/ApiError';
import pick from '../utils/pick';
import { IOptions } from '../paginate/paginate';
import * as productService from './product.service';
 
/**
 * PASO 4: El Controller.
 *
 * El controller es la capa más delgada de las tres (service, controller, route).
 * Su única responsabilidad es:
 *   1. Extraer datos del objeto `req` (body, params, query).
 *   2. Llamar al service correspondiente con esos datos.
 *   3. Enviar la respuesta HTTP con el resultado.
 *
 * NUNCA debe contener lógica de negocio (eso va en el service).
 * NUNCA debe acceder directamente al modelo Mongoose (eso también va en el service).
 *
 * catchAsync() es un wrapper que:
 *   - Envuelve la función async en un try/catch.
 *   - Si la función lanza un error, lo pasa automáticamente a next(error).
 *   - Así el errorHandler middleware lo procesa y devuelve el status correcto.
 *   Ver src/modules/utils/catchAsync.ts
 *
 * pick() es una utilidad que crea un objeto con solo los keys especificados.
 *   pick(req.query, ['name', 'category']) devuelve { name: '...', category: '...' }
 *   descartando cualquier otro query param no autorizado.
 *   Ver src/modules/utils/pick.ts
 */
 
/**
 * createProduct - POST /v1/products
 *
 * Crea un producto nuevo con los datos del body.
 * El middleware validate(productValidation.createProduct) ya validó el body con Joi
 * antes de llegar acá, así que podemos confiar en req.body.
 *
 * Responde con 201 Created y el documento creado.
 * El plugin toJSON ya convirtió _id -> id y eliminó campos privados.
 */
export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);
  res.status(httpStatus.CREATED).send(product);
});
 
/**
 * getProducts - GET /v1/products
 *
 * Lista productos con paginación y filtros.
 *
 * FILTROS disponibles (query params):
 *   - name: filtra por nombre (coincidencia exacta en MongoDB)
 *   - category: filtra por categoría
 *
 * OPCIONES de paginación (query params):
 *   - sortBy: campo:dirección, ej. price:asc, name:desc
 *   - limit: cantidad de resultados por página (default 10)
 *   - page: número de página (default 1)
 *   - projectBy: campo:hide o campo:include para proyecciones
 *
 * pick() aquí cumple dos funciones:
 *   1. Seguridad: filtra solo los query params que queremos aceptar.
 *   2. Mapeo: separa los filtros de las opciones de paginación.
 */
export const getProducts = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, ['name', 'category']);
  if (typeof filter['name'] === 'string' && filter['name']) {
    filter['name'] = new RegExp(filter['name'], 'i');
  }
  /**
   * filter = { category: 'electronica' } si el request fue GET /products?category=electronica
   * Este objeto se pasa directamente a Product.paginate() como el filtro MongoDB.
   */
 
  const options: IOptions = pick(req.query, ['sortBy', 'limit', 'page', 'projectBy']);
  /**
   * options = { limit: '5', page: '2', sortBy: 'price:asc' }
   * El plugin paginate convierte estos strings a los tipos correctos internamente.
   */
 
  const result = await productService.queryProducts(filter, options);
  res.send(result);
  /**
   * result tiene la forma:
   * {
   *   results: [...],
   *   page: 2,
   *   limit: 5,
   *   totalPages: 10,
   *   totalResults: 48
   * }
   */
});
 
/**
 * getProduct - GET /v1/products/:productId
 *
 * Obtiene un producto específico por su ID.
 *
 * Verificamos que req.params['productId'] sea string (TypeScript requiere esto
 * porque params podría ser undefined en algunos contextos).
 *
 * Si el service retorna null (no encontrado), lanzamos ApiError 404.
 * catchAsync capturará ese error y lo pasará al errorHandler middleware.
 */
export const getProduct = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['productId'] === 'string') {
    const product = await productService.getProductById(
      new mongoose.Types.ObjectId(req.params['productId'])
    );
    /**
     * new mongoose.Types.ObjectId(string) convierte el string del URL
     * al tipo ObjectId que MongoDB espera.
     * El middleware validate(productValidation.getProduct) ya verificó
     * con la custom validation `objectId` que el string tiene formato válido.
     */
 
    if (!product) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Producto no encontrado');
    }
 
    res.send(product);
  }
});
 
/**
 * updateProduct - PATCH /v1/products/:productId
 *
 * Actualiza parcialmente un producto.
 * PATCH (no PUT) porque solo actualiza los campos enviados, no reemplaza todo.
 *
 * El service maneja el 404 si no existe, así que el controller
 * simplemente pasa los datos y envía la respuesta.
 */
export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['productId'] === 'string') {
    const product = await productService.updateProductById(
      new mongoose.Types.ObjectId(req.params['productId']),
      req.body
    );
    res.send(product);
  }
});

export const checkoutProducts = catchAsync(async (req: Request, res: Response) => {
  const products = await productService.checkoutProducts(req.body.items);
  res.send({ products });
});
 
/**
 * deleteProduct - DELETE /v1/products/:productId
 *
 * Elimina un producto. Responde con 204 No Content (sin body).
 * 204 es el status correcto para DELETE exitoso según el estándar REST.
 *
 * El service lanza ApiError 404 si el producto no existe.
 */
export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  if (typeof req.params['productId'] === 'string') {
    await productService.deleteProductById(
      new mongoose.Types.ObjectId(req.params['productId'])
    );
    res.status(httpStatus.NO_CONTENT).send();
  }
});
