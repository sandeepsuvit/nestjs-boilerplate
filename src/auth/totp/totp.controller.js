import { Controller, Dependencies, UseGuards, Post, Request, Body, Put, Bind, UseFilters } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TotpService } from './totp.service';
import { TotpExceptionFilter } from './totp-exception.filter';

@Controller('auth/totp')
@UseFilters(TotpExceptionFilter)
@Dependencies(TotpService)
export class TotpController {
  constructor (totpService) {
    this.totpService = totpService;
  }

  @UseGuards(AuthGuard('bearer'))
  @Post('generate')
  @Bind(Request())
  async generate({ user }) {
    return await this.totpService.generate(user);
  }

  @UseGuards(AuthGuard('bearer'))
  @Post('enable')
  @Bind(Request(), Body())
  async enable({ user }, { token }) {
    await this.totpService.enable(user, token);
    return {};
  }

  @UseGuards(AuthGuard('bearer'))
  @Post('disableWithToken')
  @Bind(Request(), Body())
  async disable({ user }, { token }) {
    await this.totpService.disableWithToken(user, token);
    return {};
  }
  
  @Post('disableWithBackupCode')
  @Bind(Request(), Body())
  async disable({ user }, { code }) {
    await this.totpService.disableWithToken(user, code);
    return {};
  }
  
}
