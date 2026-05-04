import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { NextFunction, Request, Response } from 'express';

const uploadDir = path.resolve('uploads', 'products');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    callback(null, true);
    return;
  }

  callback(new Error('Solo se permiten imagenes'));
};

export const uploadProductImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

export const appendProductImageUrl = (req: Request, _res: Response, next: NextFunction) => {
  if (req.file) {
    req.body.imageUrl = `/uploads/products/${req.file.filename}`;
  }

  next();
};
