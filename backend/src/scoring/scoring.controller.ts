import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ScoringService } from './scoring.service';

@Controller('scoring')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Get('bins')
  getBins() {
    return this.scoringService.getBins();
  }

  @Post('recompute')
  recompute() {
    return this.scoringService.recomputeAllScores();
  }

  // Generar plan con los Top N bins más riesgosos
  @Post('audit-plan')
  async createAuditPlan(@Body('limit') limit: number = 5) {
    return this.scoringService.createAuditPlan(limit);
  }

  // Registrar conteo físico desde la app móvil
  @Post('audit-task/:id/count')
  async recordCount(
    @Param('id') taskId: string,
    @Body('countedQty') countedQty: number,
    @Body('result') result: string,
  ) {
    return this.scoringService.recordCount(taskId, countedQty, result);
  }
}