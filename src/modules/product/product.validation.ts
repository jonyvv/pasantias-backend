import Joi from 'joi';
import { objectId } from '../validate/custom.validation';
import { NewProduct } from './product.interfaces';
 
/**
 * PASO 5: Validaciones con Joi.
 *
 * Joi es una librería de validación de schemas para JavaScript/TypeScript.
 * El middleware validate() (ver src/modules/validate/validate.middleware.ts)
 * recibe uno de estos schemas y valida req.body, req.params, o req.query.
 *
 * Si la validación falla, el middleware llama next(new ApiError(400, mensaje))
 * y el request nunca llega al controller.
 *
 * Patrón que seguimos de user.validation.ts:
 *   - Definimos un objeto para el body de CREATE usando Record<keyof NewProduct, any>.
 *     Esto hace que TypeScript nos avise si olvidamos validar algún campo del tipo.
 *   - Cada endpoint tiene su propio schema exportado como objeto con claves
 *     'body', 'params', y/o 'query'.
 */
 
/**
 * createProductBody mapea cada key de NewProduct a su schema Joi.
 *
 * Record<keyof NewProduct, any> es un tipo que fuerza que el objeto
 * tenga exactamente las mismas keys que NewProduct.
 * Si agregamos un campo nuevo a IProduct y olvidamos validarlo aquí,
 * TypeScript nos dará un error de compilación. ¡Excelente!
 */
const createProductBody: Record<keyof NewProduct, any> = {
  name: Joi.string().required(),
  /**
   * Joi.string() valida que sea un string.
   * .required() indica que el campo no puede faltar ni ser vacío.
   */
 
  description: Joi.string().required(),
 
  price: Joi.number().required().min(0),
  /**
   * Joi.number() acepta números.
   * .min(0) asegura que no sea negativo.
   * Esta validación complementa la del schema de Mongoose.
   */
 
  category: Joi.string().required(),
  /**
   * No restringimos a un enum de categorías por ahora para mantener
   * el sistema flexible. Si el negocio lo requiere, se puede agregar:
   * .valid('electronica', 'ropa', 'alimentos', ...)
   */
 
  stock: Joi.number().required().min(0).integer(),
  imageUrl: Joi.string(),
  /**
   * .integer() asegura que el stock sea un número entero (no 2.5 unidades).
   */
};
 
/**
 * Schema para POST /products
 * Solo valida el body. No hay params ni query en este endpoint.
 */
export const createProduct = {
  body: Joi.object().keys(createProductBody),
};
 
/**
 * Schema para GET /products
 * Solo valida query params. El body está vacío en GET.
 *
 * Todos los filtros y opciones son opcionales: si el cliente
 * no los manda, el sistema usa los defaults (page 1, limit 10, sin filtros).
 */
export const getProducts = {
  query: Joi.object().keys({
    name: Joi.string(),
    /**
     * Si se manda ?name=laptop, filtramos por ese nombre exacto.
     * Para búsqueda parcial habría que modificar el service para
     * usar { name: new RegExp(name, 'i') } en el filter.
     */
 
    category: Joi.string(),
    /**
     * ?category=electronica filtra productos de esa categoría.
     * Como guardamos category en lowercase, funciona sin importar
     * cómo lo mande el cliente (Mongoose lo normaliza antes de guardar).
     */
 
    sortBy: Joi.string(),
    /**
     * Formato: campo:dirección
     * Ejemplos: price:asc, name:desc, stock:asc
     * Múltiples: price:asc,name:desc
     * El plugin paginate parsea este string internamente.
     */
 
    projectBy: Joi.string(),
    /**
     * Formato: campo:include o campo:hide
     * Ejemplos: description:hide (oculta descripción en respuesta)
     * Múltiples: description:hide,stock:hide
     */
 
    limit: Joi.number().integer(),
    /**
     * Cantidad de resultados por página.
     * Si no se manda, el plugin paginate usa 10 como default.
     */
 
    page: Joi.number().integer(),
    /**
     * Número de página (empieza en 1).
     * Si no se manda, el plugin paginate usa 1 como default.
     */
  }),
};
 
/**
 * Schema para GET /products/:productId
 * Solo valida params. La custom validation `objectId` verifica
 * que el string sea un MongoDB ObjectId válido (24 caracteres hexadecimales).
 */
export const getProduct = {
  params: Joi.object().keys({
    productId: Joi.string().custom(objectId),
    /**
     * objectId está definida en src/modules/validate/custom.validation.ts
     * Verifica que el valor matchee /^[0-9a-fA-F]{24}$/
     * Si no matchea, Joi devuelve el mensaje de error de la custom validation.
     */
  }),
};
 
/**
 * Schema para PATCH /products/:productId
 * Valida tanto params (el ID) como body (los campos a actualizar).
 *
 * .min(1) en el body object asegura que el cliente mande al menos un campo.
 * No tiene sentido hacer PATCH sin datos para actualizar.
 */
export const updateProduct = {
  params: Joi.object().keys({
    productId: Joi.required().custom(objectId),
    /**
     * Nota: Joi.required().custom() en vez de Joi.string().custom()
     * Exactamente como en user.validation.ts para consistencia.
     */
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      description: Joi.string(),
      price: Joi.number().min(0),
      category: Joi.string(),
      stock: Joi.number().min(0).integer(),
      imageUrl: Joi.string(),
    })
    .min(1),
    /**
     * Todos los campos son opcionales en PATCH (eso es la esencia de PATCH).
     * Pero al menos uno debe estar presente (.min(1)).
     * Si el cliente manda solo { price: 299.99 }, solo se actualiza el precio.
     */
};

export const checkoutProducts = {
  body: Joi.object().keys({
    items: Joi.array().items(
      Joi.object().keys({
        productId: Joi.string().required().custom(objectId),
        quantity: Joi.number().required().integer().min(1),
      })
    ).min(1).required(),
  }),
};
 
/**
 * Schema para DELETE /products/:productId
 * Solo valida el param con el ObjectId.
 */
export const deleteProduct = {
  params: Joi.object().keys({
    productId: Joi.string().custom(objectId),
  }),
};
