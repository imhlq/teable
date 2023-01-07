import { Injectable } from '@nestjs/common';
import type { IOtOperation, IRecordSnapshot } from '@teable-group/core';
import { generateRecordId, OpBuilder } from '@teable-group/core';
import { PrismaService } from '../../../prisma.service';
import { ShareDbService } from '../../../share-db/share-db.service';
import type { CreateRecordsDto } from '../create-records.dto';
import { RecordService } from '../record.service';

@Injectable()
export class RecordOpenApiService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly recordService: RecordService,
    private readonly shareDbService: ShareDbService
  ) {}

  async multipleCreateRecords(tableId: string, createRecordsDto: CreateRecordsDto) {
    const result = await this.multipleCreateRecords2Ops(tableId, createRecordsDto);
    await Promise.all(
      result.createSnapshots.map((snapshot) => {
        return this.shareDbService.createDocument(tableId, snapshot.record.id, snapshot);
      })
    );

    await Promise.all(
      result.recordOperations.map((item) => {
        return this.shareDbService.submitOps(tableId, item.recordId, item.ops);
      })
    );
  }

  async multipleCreateRecords2Ops(
    tableId: string,
    createRecordsDto: CreateRecordsDto
  ): Promise<{
    createSnapshots: IRecordSnapshot[];
    recordOperations: { recordId: string; ops: IOtOperation[] }[];
  }> {
    const defaultView = await this.prismaService.view.findFirstOrThrow({
      where: { tableId },
      select: { id: true },
    });

    const { dbTableName } = await this.prismaService.tableMeta.findUniqueOrThrow({
      where: {
        id: tableId,
      },
      select: {
        dbTableName: true,
      },
    });

    const rowCount = await this.recordService.getRowCount(this.prismaService, dbTableName);
    const createSnapshots = createRecordsDto.records.map<IRecordSnapshot>(() => {
      const recordId = generateRecordId();
      return OpBuilder.creator.addRecord.build(recordId);
    });

    const recordOperations = createRecordsDto.records.map<{
      recordId: string;
      ops: IOtOperation[];
    }>((record, index) => {
      const recordId = createSnapshots[index].record.id;
      const setRecordOps = Object.entries(record.fields).map(([fieldId, value]) =>
        OpBuilder.editor.setRecord.build({
          recordId,
          fieldId,
          oldCellValue: null,
          newCellValue: value,
        })
      );
      const setRecordOrderOp = OpBuilder.editor.setRecordOrder.build({
        viewId: defaultView.id,
        newOrder: rowCount,
      });

      return {
        recordId,
        ops: [...setRecordOps, setRecordOrderOp],
      };
    }, []);

    return {
      createSnapshots,
      recordOperations,
    };
  }
}
