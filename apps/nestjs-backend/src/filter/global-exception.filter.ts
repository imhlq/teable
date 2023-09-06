import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { BadRequestException, Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpErrorCode, type IHttpError } from '@teable-group/core';
import type { Response } from 'express';
import { AjvError } from '../utils/catch-error';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private logger = new Logger(GlobalExceptionFilter.name);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error((exception as Error).message, (exception as Error).stack);

    if (exception instanceof BadRequestException || exception.getStatus?.() === 400) {
      return response.status(400).json({
        message: exception.message,
        status: 400,
        code: HttpErrorCode.INVALID_REQUEST,
      } as IHttpError);
    }
    if (exception instanceof AjvError) {
      return response.status(400).json({
        message: exception.message,
        status: 400,
        code: HttpErrorCode.VALIDATION_ERROR,
      } as IHttpError);
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return response.status(status).json({ message: exception.message, status } as IHttpError);
    }

    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Internal Server Error' } as IHttpError);
  }
}
