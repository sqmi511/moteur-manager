import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const i = err.issues[0];
    return res.status(400).json({ message: `${i.path.join('.') || 'body'}: ${i.message}`, issues: err.issues });
  }
  if (err instanceof HttpError) return res.status(err.status).json({ message: err.message });
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large (max 2 MB)' : err.message });
  }
  if (err?.code === 11000) return res.status(409).json({ message: 'This value already exists' });
  if (err?.name === 'CastError' || err?.name === 'ValidationError') return res.status(400).json({ message: err.message });
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
};
