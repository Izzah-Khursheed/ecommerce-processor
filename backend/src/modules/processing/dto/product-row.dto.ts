import { plainToInstance, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

/**
 * The shape + rules every product row must satisfy.
 * A row is "successful" only if it passes ALL of these.
 */
export class ProductRowDto {
  @IsString()
  @IsNotEmpty({ message: 'sku is required' })
  sku: string;

  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'description is required' })
  description: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'price must be a number' })
  @IsPositive({ message: 'price must be greater than 0' })
  price: number;

  @IsString()
  @IsNotEmpty({ message: 'category is required' })
  category: string;

  @IsString()
  @IsNotEmpty({ message: 'color is required' })
  color: string;

  @Type(() => Number)
  @IsInt({ message: 'stock must be a whole number' })
  @Min(0, { message: 'stock cannot be negative' })
  stock: number;
}

export interface RowValidationResult {
  valid: boolean;
  dto?: ProductRowDto;
  errors: string[];
}

/**
 * Normalize a raw row (values may be numbers, strings, null) and validate it.
 * Returns the typed DTO when valid, or a list of human-readable errors.
 */
export function validateProductRow(raw: Record<string, unknown>): RowValidationResult {
  const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim());

  const candidate = {
    sku: str(raw.sku),
    name: str(raw.name),
    description: str(raw.description),
    price: raw.price, // left raw; @Type(() => Number) coerces it
    category: str(raw.category),
    color: str(raw.color),
    stock: raw.stock, // left raw; @Type(() => Number) coerces it
  };

  const dto = plainToInstance(ProductRowDto, candidate, {
    enableImplicitConversion: false,
  });

  const validationErrors = validateSync(dto, {
    whitelist: true,
    stopAtFirstError: false,
  });

  if (validationErrors.length === 0) {
    return { valid: true, dto, errors: [] };
  }

  const errors = validationErrors.flatMap((e) =>
    e.constraints ? Object.values(e.constraints) : [`${e.property} is invalid`],
  );
  return { valid: false, errors };
}
