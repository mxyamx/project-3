import { TestBed } from '@angular/core/testing';

import { ChatDockService } from './chat-dock.service';

describe('ChatDockService', () => {
  let service: ChatDockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatDockService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
