import { Injectable, Dependencies, HttpException, HttpStatus } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as Argon2 from 'argon2';
import * as Crypto from 'crypto';
import { CacheManager } from '../cache';
import AuthException from './auth.exception';
import { ConfigService } from '@nestjs/config';

@Injectable()
@Dependencies(UsersService, ConfigService, CacheManager)
export class AuthService {

  constructor(usersService, configService, cache) {
    this.usersService = usersService;
    this.configService = configService;
    this.cache = cache;
  }

  async validateUser (login, password) {
    const user = await this.usersService.findOneByLogin(login);
    if (user && await this.verifyPassword(user.password, password)) {
      return user;
    }
    return null;
  }
  
  async validateAccessToken (accessToken) {
    const accessTokenPayload = JSON.parse(await this.cache.get(accessToken));
    if (accessTokenPayload) {
      const user = await this.usersService.findOneById(accessTokenPayload.userId);
      return user || null;
    }
    return null;
  }

  async login (user) { // TODO: Add limit for failed attempts
    if (this.configService.get('auth.needsConfirmedRegistrationToLogin') && !user.registrationConfirmedAt) {
      throw new AuthException('REGISTRATION_CONFIRMATION_NEEDED');
    }
    const expireTime = 3600;
    const accessTokenLength = 64;
    const accessToken = await this.generateAccessToken(accessTokenLength);
    await this.cache.set(accessToken, JSON.stringify({
      userId: user.id,
    }), {
      expire: expireTime,
    });
    return {
      accessToken,
      expiresAt: Math.floor(Date.now() / 1000) + expireTime,
    };
  }

  async register (request, registerDto) { // TODO: Registrations limit from one IP address.
    try {
      const hashedPassword = await this.hashPassword(registerDto.password);
      await this.usersService.create({
        ...registerDto,
        password: hashedPassword,
      }, true);
      return {};
    } catch (error) {
      throw new AuthException(error.message);
    }
  }

  generateAccessToken (length) {
    return new Promise((resolve, reject) => {
      Crypto.randomBytes(length, (error, bytes) => {
        if (error) {
          return reject(error);
        }
        resolve(bytes.toString('base64'));
      });
    });
  }

  async verifyPassword (hashedPassword, password) {
    try {
      return await Argon2.verify(hashedPassword, password);
    } catch (error) {
      console.log(error);
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async hashPassword (password) {
    try {
      return await Argon2.hash(password);
    } catch (error) {
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}