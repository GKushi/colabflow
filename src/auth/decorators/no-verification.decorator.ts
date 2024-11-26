import { SetMetadata } from '@nestjs/common';

export const NoVerification = () => SetMetadata('no-verification', true);
