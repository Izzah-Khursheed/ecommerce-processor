import { IsEmail } from 'class-validator';

/** Body of POST /uploads — where to email the result. */
export class CreateUploadDto {
  @IsEmail({}, { message: 'A valid "email" field is required to receive results.' })
  email: string;
}
