import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BranchAccessGuard } from '../../common/guards/branch-access.guard';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>('SESSION_SECRET') ||
          config.get<string>('JWT_SECRET') ||
          'super_secret_session_key_change_in_production_32chars',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard, BranchAccessGuard],
  exports: [AuthService, JwtModule, AuthGuard, RolesGuard, BranchAccessGuard],
})
export class AuthModule {}
