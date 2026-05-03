import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordHasherService {
  constructor(private configService: ConfigService) {}

  async hash(password: string): Promise<string> {
    const rounds = this.configService.get<number>('bcrypt.rounds') ?? 10;
    return bcrypt.hash(password, rounds);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
