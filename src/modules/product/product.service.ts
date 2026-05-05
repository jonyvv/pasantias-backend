import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Product from './product.model';
import User from '../user/user.model';
import ApiError from '../errors/ApiError';
import { IOptions, QueryResult } from '../paginate/paginate';
import { NewProduct, UpdateProductBody, IProductDoc } from './product.interfaces';
 
/**
 * PASO 3: La capa de servicio (Service Layer).
 *
 * Esta capa contiene TODA la lógica de negocio.
 * Principios clave que seguimos del patrón user.service.ts:
 *
 *   1. Funciones puras y exportadas individualmente (no una clase).
 *      Esto facilita el testing unitario de cada función por separado.
 *
 *   2. Lanza ApiError (no errores genéricos) para que el errorHandler
 *      del middleware sepa cómo responder con el status HTTP correcto.
 *
 *   3. No importa nada de Express (Request, Response, etc.).
 *      Eso es responsabilidad del Controller.
 *
 *   4. Recibe tipos concretos de TypeScript, no `any`.
 *      Esto nos da autocompletado y seguridad de tipos.
 */
 
/**
 * createProduct
 *
 * Crea un nuevo producto en la BD.
 * No tiene validaciones de negocio complejas (como verificar email único
 * en users), pero sigue el mismo patrón: recibe el body ya validado
 * por Joi en el middleware, y llama a Product.create().
 *
 * @param {NewProduct} productBody - Datos del producto ya validados por Joi
 * @returns {Promise<IProductDoc>} - El documento creado en MongoDB
 */
export const createProduct = async (productBody: NewProduct): Promise<IProductDoc> => {
  return Product.create(productBody);
  /**
   * Product.create() hace dos cosas:
   *   1. Crea una instancia del modelo con los datos.
   *   2. Llama a .save() que persiste en MongoDB y ejecuta las validaciones
   *      del schema (como que price >= 0).
   * Si algo falla, lanza un error que el errorConverter del middleware
   * convierte automáticamente en ApiError 400.
   */
};
 
/**
 * queryProducts
 *
 * Lista productos con paginación, filtros y ordenamiento.
 * Exactamente igual que queryUsers en user.service.ts.
 *
 * El filter es un objeto MongoDB nativo, por ejemplo:
 *   { category: 'electronica' }
 *   { name: /laptop/i }
 *
 * Las options vienen del query string de Express, por ejemplo:
 *   ?page=2&limit=5&sortBy=price:asc
 *
 * El plugin paginate transforma esos options en la query de MongoDB.
 *
 * @param {Record<string, any>} filter - Filtro MongoDB
 * @param {IOptions} options - Opciones de paginación
 * @returns {Promise<QueryResult>} - { results, page, limit, totalPages, totalResults }
 */
export const queryProducts = async (filter: Record<string, any>, options: IOptions): Promise<QueryResult> => {
  const products = await Product.paginate(filter, options);
  return products;
};
 
/**
 * getProductById
 *
 * Busca un producto por su _id de MongoDB.
 * Retorna null si no existe (el controller decide qué hacer con ese null,
 * generalmente lanzar 404).
 *
 * @param {mongoose.Types.ObjectId} id - El ObjectId del producto
 * @returns {Promise<IProductDoc | null>}
 */
export const getProductById = async (id: mongoose.Types.ObjectId): Promise<IProductDoc | null> =>
  Product.findById(id);
  /**
   * Usamos arrow function de una línea para funciones simples,
   * igual que getUserById y getUserByEmail en user.service.ts.
   * Esto hace el código más limpio cuando no hay lógica adicional.
   */
 
/**
 * updateProductById
 *
 * Actualiza un producto por su id.
 * Sigue el mismo patrón que updateUserById:
 *   1. Primero busca el documento (para verificar que existe).
 *   2. Usa Object.assign() para aplicar los cambios en memoria.
 *   3. Llama a .save() para persistir (ejecuta validaciones del schema).
 *
 * ¿Por qué no usar findByIdAndUpdate()? Porque .save() ejecuta los
 * hooks de Mongoose (pre-save) y las validaciones del schema.
 * findByIdAndUpdate() los saltea por defecto.
 *
 * @param {mongoose.Types.ObjectId} productId
 * @param {UpdateProductBody} updateBody - Campos a actualizar (Partial<IProduct>)
 * @returns {Promise<IProductDoc | null>}
 */
export const updateProductById = async (
  productId: mongoose.Types.ObjectId,
  updateBody: UpdateProductBody
): Promise<IProductDoc | null> => {
  const product = await getProductById(productId);
 
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Producto no encontrado');
  }
 
  /**
   * Object.assign(target, source) copia las propiedades de source a target.
   * Esto es equivalente a hacer: product.name = updateBody.name (si existe).
   * La ventaja es que funciona para cualquier campo sin tener que listarlos.
   */
  Object.assign(product, updateBody);
 
  await product.save();
  return product;
};

export const checkoutProducts = async (
  items: { productId: string; quantity: number }[],
  userId: mongoose.Types.ObjectId
): Promise<IProductDoc[]> => {
  const updatedProducts: IProductDoc[] = [];
  const purchaseItems: {
    productId: mongoose.Types.ObjectId;
    productName: string;
    category: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    imageUrl?: string;
  }[] = [];

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  for (const item of items) {
    const product = await getProductById(new mongoose.Types.ObjectId(item.productId));

    if (!product) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Producto no encontrado');
    }

    if (product.stock < item.quantity) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Stock insuficiente para ${product.name}`);
    }

    product.stock -= item.quantity;
    await product.save();
    updatedProducts.push(product);
    purchaseItems.push({
      productId: product._id,
      productName: product.name,
      category: product.category,
      quantity: item.quantity,
      unitPrice: product.price,
      subtotal: product.price * item.quantity,
      ...(product.imageUrl ? { imageUrl: product.imageUrl } : {}),
    });
  }

  user.purchaseHistory.push({
    items: purchaseItems,
    totalAmount: purchaseItems.reduce((total, item) => total + item.subtotal, 0),
    purchasedAt: new Date(),
  });
  await user.save();

  return updatedProducts;
};
 
/**
 * deleteProductById
 *
 * Elimina un producto por su id.
 * Patrón idéntico a deleteUserById:
 *   1. Verifica que existe.
 *   2. Usa deleteOne() en la instancia (no en el modelo).
 *
 * ¿Por qué product.deleteOne() y no Product.findByIdAndDelete()?
 * Porque los hooks de Mongoose (middleware pre/post remove) solo se
 * ejecutan en instancias, no en operaciones del modelo directamente.
 *
 * @param {mongoose.Types.ObjectId} productId
 * @returns {Promise<IProductDoc | null>} - El documento eliminado
 */
export const deleteProductById = async (productId: mongoose.Types.ObjectId): Promise<IProductDoc | null> => {
  const product = await getProductById(productId);
 
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Producto no encontrado');
  }
 
  await product.deleteOne();
  return product;
};
