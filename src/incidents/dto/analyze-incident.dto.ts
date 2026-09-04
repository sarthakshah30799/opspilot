import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class AnalyzeIncidentDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsString()
  @IsIn(['P1', 'P2', 'P3', 'P4'])
  severity!: string;

  @IsString()
  @IsNotEmpty()
  service!: string;
}
