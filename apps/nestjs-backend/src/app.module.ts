import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import type { IAppConfig } from './app.interface';
import { FileTreeModule } from './features/file-tree/file-tree.module';
import { NextModule } from './features/next/next.module';
import { TableModule } from './features/table/table.module';
import { WsModule } from './ws/ws.module';

@Module({})
export class AppModule {
  static forRoot(config: IAppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        DevtoolsModule.register({
          http: process.env.NODE_ENV !== 'production',
        }),
        NextModule.forRoot(config),
        FileTreeModule,
        TableModule,
        ...(process.env.NODE_ENV === 'production' ? [WsModule] : []),
      ],
    };
  }
}
