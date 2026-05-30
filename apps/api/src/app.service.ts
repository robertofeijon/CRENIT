import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getServiceName(): string {
    return 'crenit-api';
  }
}
