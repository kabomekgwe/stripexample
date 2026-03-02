import {
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
// We use any for the schema to avoid structural type mismatches 
// when schemas are imported from other packages in a monorepo.


export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: any) { }

  transform(value: unknown, _metadata: ArgumentMetadata) {
    try {
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      throw new BadRequestException('Validation failed', {
        cause: error,
        description: error.errors || 'Invalid request data',
      });
    }
  }
}
