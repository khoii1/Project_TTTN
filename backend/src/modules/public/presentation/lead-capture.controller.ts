import { Body, Controller, Post } from '@nestjs/common';
import {
  LeadCaptureResponse,
  LeadCaptureService,
} from '../application/services/lead-capture.service';
import { LeadCaptureDto } from '../application/dto/lead-capture.dto';

@Controller('public')
export class LeadCaptureController {
  constructor(private readonly leadCaptureService: LeadCaptureService) {}

  @Post('lead-capture')
  capture(@Body() dto: LeadCaptureDto): Promise<LeadCaptureResponse> {
    return this.leadCaptureService.capture(dto);
  }
}
