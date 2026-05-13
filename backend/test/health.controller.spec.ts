import { HealthController } from '../src/modules/health/presentation/health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it('should return a basic health response', () => {
    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('crm-backend');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
