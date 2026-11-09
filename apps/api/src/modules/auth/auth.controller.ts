import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserDto, ApiResponse as ApiEnvelope } from '@furniture/shared';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Authentication successful, session cookie set' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or inactive account' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiEnvelope<{ user: UserDto; token: string }>> {
    const result = await this.authService.login(loginDto);

    // Set secure HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookie('agy_session', result.token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and clear session cookie' })
  async logout(@Res({ passthrough: true }) response: Response): Promise<ApiEnvelope<{ message: string }>> {
    response.clearCookie('agy_session', {
      httpOnly: true,
      path: '/',
    });

    return {
      success: true,
      data: { message: 'Logged out successfully' },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Retrieve authenticated user session profile' })
  @ApiResponse({ status: 200, description: 'Session profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  async getProfile(@CurrentUser('id') userId: string): Promise<ApiEnvelope<any>> {
    const profile = await this.authService.getProfile(userId);
    return {
      success: true,
      data: profile,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
