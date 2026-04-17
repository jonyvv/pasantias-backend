import mongoose from 'mongoose';
import toJSON from '../toJSON/toJSON';
import paginate from '../paginate/paginate';
import { IProductDoc, IProductModel } from './product.interfaces';
 
/**
 * PASO 2: El esquema Mongoose del producto.
 *
 * Comparalo con user.model.ts:
 *   - Usamos new mongoose.Schema<IProductDoc, IProductModel>() con los dos tipos genéricos.
 *     El primero es el tipo del documento (instancia), el segundo es el tipo del modelo (clase).
 *   - Agregamos { timestamps: true } para que Mongoose gestione createdAt y updatedAt.
 *     Estos campos serán removidos del JSON por el plugin toJSON.
 *   - Cada campo tiene su tipo, validaciones propias y mensajes de error descriptivos.
 */
const productSchema = new mongoose.Schema<IProductDoc, IProductModel>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      // trim: true elimina espacios al inicio y fin automáticamente.
      // Esto es importante para evitar nombres como "  Laptop  " en la BD.
    },
 
    description: {
      type: String,
      required: true,
      trim: true,
    },
 
    price: {
      type: Number,
      required: true,
      /**
       * validate() es una función que Mongoose llama antes de guardar.
       * Si lanza un Error, Mongoose lo convierte en ValidationError.
       * Esto complementa la validación de Joi en la capa de rutas:
       *   - Joi valida antes de que el request llegue al controller.
       *   - Mongoose valida al intentar persistir en la BD.
       * Tener las dos capas es una buena práctica de defensa en profundidad.
       */
      validate(value: number) {
        if (value < 0) {
          throw new Error('El precio no puede ser negativo');
        }
      },
    },
 
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      /**
       * lowercase: true normaliza la categoría a minúsculas automáticamente.
       * Así "Electronica", "ELECTRONICA" y "electronica" se guardan igual.
       * Esto hace que los filtros por categoría funcionen consistentemente.
       */
    },
 
    stock: {
      type: Number,
      required: true,
      default: 0,
      validate(value: number) {
        if (value < 0) {
          throw new Error('El stock no puede ser negativo');
        }
      },
    },
  },
  {
    timestamps: true,
    /**
     * timestamps: true hace que Mongoose agregue automáticamente:
     *   - createdAt: cuando se creó el documento
     *   - updatedAt: cuando se modificó por última vez
     * El plugin toJSON los elimina del JSON de respuesta para no
     * exponer metadatos innecesarios al cliente.
     */
  }
);
 
/**
 * PLUGINS - Exactamente igual que en user.model.ts
 *
 * toJSON: transforma _id -> id, elimina __v, createdAt, updatedAt,
 *         y cualquier campo con { private: true } en el schema.
 *         Ver src/modules/toJSON/toJSON.ts para la implementación.
 *
 * paginate: agrega el método estático Product.paginate(filter, options).
 *           Ver src/modules/paginate/paginate.ts para la implementación.
 *           Las opciones soportadas son: sortBy, limit, page, projectBy, populate.
 */
productSchema.plugin(toJSON);
productSchema.plugin(paginate);
 
/**
 * Creamos el modelo con los dos tipos genéricos:
 *   - IProductDoc: tipo de cada instancia/documento
 *   - IProductModel: tipo del modelo (para que TypeScript reconozca .paginate())
 *
 * 'Product' es el nombre de la colección (Mongoose lo pluraliza a 'products').
 */
const Product = mongoose.model<IProductDoc, IProductModel>('Product', productSchema);
 
export default Product;