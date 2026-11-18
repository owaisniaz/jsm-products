import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../auth/access-token.guard.js';
import { AccessTokenGuard } from '../../auth/access-token.guard.js';
import { PresignMediaDto } from './dtos/media.dto.js';
import { MediaFacadeService } from './media-facade.service.js';

@Controller('media')
@UseGuards(AccessTokenGuard)
export class MediaController {
  constructor(private readonly mediaFacade: MediaFacadeService) {}

  @Post('presign')
  @HttpCode(HttpStatus.OK)
  presign(
    @Req() request: AuthenticatedRequest,
    @Body() body: PresignMediaDto,
  ) {
    return this.mediaFacade.createPresignedUpload(
      request.user.sub,
      request.user.activeCompanyId ?? null,
      body,
    );
  }

  @Delete(':assetId')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Req() request: AuthenticatedRequest,
    @Param('assetId') assetId: string,
  ) {
    await this.mediaFacade.deleteOwnedAsset(
      assetId,
      request.user.sub,
      request.user.activeCompanyId ?? null,
    );
    return { assetId, status: 'DELETED' as const };
  }
}
