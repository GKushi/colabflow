import {
  Controller,
  Param,
  ParseIntPipe,
  Delete,
  UseGuards,
  Get,
} from '@nestjs/common';
import { FileModifyAccessGuard } from './guards/file-modify-access.guard';
import { FileReadAccessGuard } from './guards/file-read-access.guard';
import { UserMapper } from '../user/mappers/user.mapper';
import { ApiCookieAuth } from '@nestjs/swagger';
import { FileService } from './file.service';

@ApiCookieAuth()
@Controller('file')
export class FileController {
  constructor(private fileService: FileService) {}

  @UseGuards(FileReadAccessGuard)
  @Get(':id')
  async getFile(@Param('id', ParseIntPipe) id: number) {
    const file = await this.fileService.getOne(id);

    return {
      ...file,
      createdById: undefined,
      fileableType: undefined,
      fileableId: undefined,
      createdBy: UserMapper.toPublic(file.createdBy),
    };
  }

  @UseGuards(FileModifyAccessGuard)
  @Delete(':id')
  async deleteFile(@Param('id', ParseIntPipe) id: number) {
    await this.fileService.deleteFile(id);

    return { success: true, message: 'File deleted' };
  }
}
