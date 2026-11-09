import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@furniture/shared';

@Injectable()
export class BranchAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User context missing');
    }

    // Owner has enterprise-wide authority across all branches
    if (user.role === UserRole.OWNER) {
      return true;
    }

    // Branch Admin must have an assigned branch
    if (user.role === UserRole.BRANCH_ADMIN) {
      if (!user.branchId) {
        throw new ForbiddenException('Administrator is not assigned to any branch');
      }

      // Check route parameter, body, or query
      const targetBranchId =
        request.params.branchId ||
        request.params.id ||
        request.body?.branchId ||
        request.query?.branchId;

      if (targetBranchId && targetBranchId !== user.branchId) {
        throw new ForbiddenException(
          'Forbidden: You are not authorized to access or modify data for another branch',
        );
      }

      return true;
    }

    throw new ForbiddenException('Invalid user role');
  }
}
