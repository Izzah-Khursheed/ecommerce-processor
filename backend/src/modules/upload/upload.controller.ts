import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { UploadService } from './upload.service';
import { CreateUploadDto } from './dto/create-upload.dto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { S3Service } from '../../infrastructure/storage/s3.service';

@Controller('uploads')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  /**
   * POST /uploads  (multipart/form-data)
   *   field "file"  -> the .xlsx file
   *   field "email" -> where to send the results
   * Returns 202 Accepted immediately; processing happens in the background.
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // keep the buffer in memory to forward to S3
      limits: { fileSize: 30 * 1024 * 1024 }, // hard cap; service enforces the configured limit too
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateUploadDto,
  ) {
    return this.uploadService.handleUpload(file, body.email);
  }

  /** GET /uploads/:id — check the status/result of a batch. */
  @Get(':id')
  async getBatch(@Param('id') id: string) {
    const batch = await this.prisma.uploadBatch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException(`Batch ${id} not found`);
    return batch;
  }

  /** GET /uploads/:id/errors — download the generated "unsuccessful rows" Excel. */
  @Get(':id/errors')
  async downloadErrors(@Param('id') id: string, @Res() res: Response) {
    const batch = await this.prisma.uploadBatch.findUnique({ where: { id } });
    if (!batch || !batch.errorFileKey) {
      throw new NotFoundException(`No error file for batch ${id}`);
    }
    const buffer = await this.s3.getObject(batch.errorFileKey);
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="unsuccessful-rows.xlsx"',
    });
    res.send(buffer);
  }
}
