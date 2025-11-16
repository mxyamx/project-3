import { Test, TestingModule } from '@nestjs/testing';
import { PrizePoolService } from './prize-pool.service';

describe('PrizePoolService', () => {
  let service: PrizePoolService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrizePoolService],
    }).compile();

    service = module.get<PrizePoolService>(PrizePoolService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
