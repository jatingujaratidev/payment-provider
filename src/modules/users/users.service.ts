import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { UsersRepository } from './users.repository';
import { BCRYPT_SALT_ROUNDS } from '../../common/constants/app.constants';
import { sanitizeString } from '../../common/utils/string-sanitize.util';
import { ErrorCodes } from '../../common/errors/error-codes';
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}
  async createUser(email: string, password: string): Promise<User> {
    const normalized = sanitizeString(email).toLowerCase();
    const existing = await this.usersRepository.findByEmail(normalized);
    if (existing) {
      throw new ConflictException({
        code: ErrorCodes.USER_ALREADY_EXISTS,
        message: 'Email already registered',
      });
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const entity = new User();
    entity.email = normalized;
    entity.passwordHash = passwordHash;
    entity.isActive = true;
    return this.usersRepository.save(entity);
  }
  async validateCredentials(email: string, password: string): Promise<User> {
    const normalized = sanitizeString(email).toLowerCase();
    const user = await this.usersRepository.findByEmail(normalized);
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Invalid credentials',
      });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Invalid credentials',
      });
    }
    return user;
  }
  async getByIdOrThrow(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: 'User not found',
      });
    }
    return user;
  }
}
