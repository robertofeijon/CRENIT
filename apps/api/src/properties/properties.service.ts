import { Injectable } from '@nestjs/common';

@Injectable()
export class PropertiesService {
  getPortfolio(): string {
    return 'Property module is online.';
  }
}
