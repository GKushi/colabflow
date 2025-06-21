import { applyDecorators, SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

export const Public = () => {
  return applyDecorators(
    Throttle({ default: { ttl: 60000, limit: 3 } }),
    SetMetadata('public', true),
  );
};
