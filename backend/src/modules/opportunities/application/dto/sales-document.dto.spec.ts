import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateQuoteDto, UpdateQuoteDto } from './sales-document.dto';

describe('Quote DTO validation', () => {
  const validateCreate = (payload: Record<string, unknown>) =>
    validate(plainToInstance(CreateQuoteDto, payload));

  it('accepts a valid quote name and trims it', async () => {
    const dto = plainToInstance(CreateQuoteDto, {
      name: '  Báo giá gói tiêu chuẩn  ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.name).toBe('Báo giá gói tiêu chuẩn');
  });

  it('rejects a missing quote name', async () => {
    const errors = await validateCreate({});
    expect(errors[0].constraints?.isDefined).toBe('Tên báo giá là bắt buộc.');
  });

  it.each([
    ['', 'Tên báo giá không được để trống.'],
    ['   ', 'Tên báo giá không được để trống.'],
  ])('rejects an empty quote name %#', async (name, expectedMessage) => {
    const errors = await validateCreate({ name });
    expect(Object.values(errors[0].constraints || {})).toContain(expectedMessage);
  });

  it('rejects a quote name longer than 200 characters', async () => {
    const errors = await validateCreate({ name: 'a'.repeat(201) });
    expect(errors[0].constraints?.maxLength).toBe('Tên báo giá không được vượt quá 200 ký tự.');
  });

  it('rejects non-string quote names', async () => {
    const errors = await validateCreate({ name: 123 });
    expect(errors[0].constraints?.isString).toBe('Tên báo giá phải là chuỗi.');
  });

  it('applies the same trimming and validation when renaming', async () => {
    const dto = plainToInstance(UpdateQuoteDto, { name: '  Báo giá lần 2  ' });
    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.name).toBe('Báo giá lần 2');
  });
});
