import mongoose, { Model, Document } from 'mongoose';
import { QueryResult } from '../paginate/paginate';
 
/**
 * IProduct define la forma del documento de producto en la base de datos.
 * Nótese que seguimos exactamente el mismo patrón que IUser en user.interfaces.ts:
 * primero la interfaz plana, luego el Document, luego el Model con métodos estáticos.
 */
export interface IProduct {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
}
 
/**
 * IProductDoc extiende IProduct + Document de Mongoose.
 * Esto nos permite tener acceso a .save(), .deleteOne(), etc. en las instancias.
 * En users teníamos isPasswordMatch() aquí; en products no necesitamos métodos
 * de instancia extra por ahora.
 */
export interface IProductDoc extends IProduct, Document {}
 
/**
 * IProductModel es el tipo del modelo Mongoose en sí (la clase, no una instancia).
 * Aquí declaramos los métodos estáticos como paginate().
 * El plugin de paginación lo agrega dinámicamente, pero TypeScript
 * necesita saber que existe para no dar error de compilación.
 */
export interface IProductModel extends Model<IProductDoc> {
  paginate(filter: Record<string, any>, options: Record<string, any>): Promise<QueryResult>;
}
 
/**
 * UpdateProductBody es Partial<IProduct>, igual que UpdateUserBody.
 * Así PATCH puede recibir solo los campos que quiere actualizar,
 * sin necesidad de mandar todo el objeto.
 */
export type UpdateProductBody = Partial<IProduct>;
 
/**
 * NewProduct es lo que recibe POST /products cuando un admin crea uno.
 * A diferencia de users, acá no hay campos que se auto-generen en el server
 * (como isEmailVerified), así que NewProduct == IProduct.
 * Aun así lo exportamos como alias para mantener consistencia con el patrón.
 */
export type NewProduct = IProduct;
 
/**
 * Exportamos también mongoose aunque no se use directamente aquí,
 * para mantener consistencia con el patrón del módulo user donde
 * mongoose.Types.ObjectId se usa en las firmas del service.
 */
export { mongoose };
 