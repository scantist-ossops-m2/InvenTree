import { t } from '@lingui/macro';
import {
  Alert,
  Badge,
  Grid,
  Group,
  LoadingOverlay,
  Skeleton,
  Stack,
  Text
} from '@mantine/core';
import {
  IconBookmark,
  IconBoxPadding,
  IconChecklist,
  IconCopy,
  IconDots,
  IconHistory,
  IconInfoCircle,
  IconNotes,
  IconPackages,
  IconPaperclip,
  IconSitemap
} from '@tabler/icons-react';
import { ReactNode, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { DetailsField, DetailsTable } from '../../components/details/Details';
import DetailsBadge from '../../components/details/DetailsBadge';
import { DetailsImage } from '../../components/details/DetailsImage';
import { ItemDetailsGrid } from '../../components/details/ItemDetails';
import {
  ActionDropdown,
  BarcodeActionDropdown,
  DeleteItemAction,
  EditItemAction,
  LinkBarcodeAction,
  UnlinkBarcodeAction,
  ViewBarcodeAction
} from '../../components/items/ActionDropdown';
import { PageDetail } from '../../components/nav/PageDetail';
import { PanelGroup, PanelType } from '../../components/nav/PanelGroup';
import { StockLocationTree } from '../../components/nav/StockLocationTree';
import { StatusRenderer } from '../../components/render/StatusRenderer';
import { NotesEditor } from '../../components/widgets/MarkdownEditor';
import { ApiEndpoints } from '../../enums/ApiEndpoints';
import { ModelType } from '../../enums/ModelType';
import { UserRoles } from '../../enums/Roles';
import {
  StockOperationProps,
  useAddStockItem,
  useCountStockItem,
  useEditStockItem,
  useRemoveStockItem,
  useTransferStockItem
} from '../../forms/StockForms';
import { InvenTreeIcon } from '../../functions/icons';
import { getDetailUrl } from '../../functions/urls';
import { useInstance } from '../../hooks/UseInstance';
import { apiUrl } from '../../states/ApiState';
import { useUserState } from '../../states/UserState';
import { AttachmentTable } from '../../tables/general/AttachmentTable';
import InstalledItemsTable from '../../tables/stock/InstalledItemsTable';
import { StockItemTable } from '../../tables/stock/StockItemTable';
import StockItemTestResultTable from '../../tables/stock/StockItemTestResultTable';

export default function StockDetail() {
  const { id } = useParams();

  const user = useUserState();

  const [treeOpen, setTreeOpen] = useState(false);

  const {
    instance: stockitem,
    refreshInstance,
    instanceQuery
  } = useInstance({
    endpoint: ApiEndpoints.stock_item_list,
    pk: id,
    params: {
      part_detail: true,
      location_detail: true,
      path_detail: true
    }
  });

  const detailsPanel = useMemo(() => {
    let data = stockitem;
    let part = stockitem?.part_detail ?? {};

    data.available_stock = Math.max(0, data.quantity - data.allocated);

    if (instanceQuery.isFetching) {
      return <Skeleton />;
    }

    // Top left - core part information
    let tl: DetailsField[] = [
      {
        name: 'part',
        label: t`Base Part`,
        type: 'link',
        model: ModelType.part
      },
      {
        name: 'status',
        type: 'status',
        label: t`Stock Status`,
        model: ModelType.stockitem
      },
      {
        type: 'text',
        name: 'tests',
        label: `Completed Tests`,
        icon: 'progress',
        hidden: !part?.trackable
      },
      {
        type: 'text',
        name: 'updated',
        icon: 'calendar',
        label: t`Last Updated`
      },
      {
        type: 'text',
        name: 'stocktake',
        icon: 'calendar',
        label: t`Last Stocktake`,
        hidden: !stockitem.stocktake
      }
    ];

    // Top right - available stock information
    let tr: DetailsField[] = [
      {
        type: 'text',
        name: 'quantity',
        label: t`Quantity`
      },
      {
        type: 'text',
        name: 'serial',
        label: t`Serial Number`,
        hidden: !stockitem.serial
      },
      {
        type: 'text',
        name: 'available_stock',
        label: t`Available`,
        icon: 'quantity'
      }
      // TODO: allocated_to_sales_orders
      // TODO: allocated_to_build_orders
    ];

    // Bottom left: location information
    let bl: DetailsField[] = [
      {
        name: 'supplier_part',
        label: t`Supplier Part`,
        type: 'link',
        model: ModelType.supplierpart,
        hidden: !stockitem.supplier_part
      },
      {
        type: 'link',
        name: 'location',
        label: t`Location`,
        model: ModelType.stocklocation,
        hidden: !stockitem.location
      },
      {
        type: 'link',
        name: 'belongs_to',
        label: t`Installed In`,
        model_formatter: (model: any) => {
          let text = model?.part_detail?.full_name ?? model?.name;
          if (model.serial && model.quantity == 1) {
            text += `# ${model.serial}`;
          }

          return text;
        },
        icon: 'stock',
        model: ModelType.stockitem,
        hidden: !stockitem.belongs_to
      },
      {
        type: 'link',
        name: 'consumed_by',
        label: t`Consumed By`,
        model: ModelType.build,
        hidden: !stockitem.consumed_by,
        icon: 'build',
        model_field: 'reference'
      },
      {
        type: 'link',
        name: 'build',
        label: t`Build Order`,
        model: ModelType.build,
        hidden: !stockitem.build,
        model_field: 'reference'
      },
      {
        type: 'link',
        name: 'sales_order',
        label: t`Sales Order`,
        model: ModelType.salesorder,
        hidden: !stockitem.sales_order,
        icon: 'sales_orders',
        model_field: 'reference'
      },
      {
        type: 'link',
        name: 'customer',
        label: t`Customer`,
        model: ModelType.company,
        hidden: !stockitem.customer
      }
    ];

    // Bottom right - any other information
    let br: DetailsField[] = [
      // TODO: Expiry date
      // TODO: Ownership
      {
        type: 'text',
        name: 'packaging',
        icon: 'part',
        label: t`Packaging`,
        hidden: !stockitem.packaging
      }
    ];

    return (
      <ItemDetailsGrid>
        <Grid>
          <Grid.Col span={4}>
            <DetailsImage
              appRole={UserRoles.part}
              apiPath={ApiEndpoints.part_list}
              src={
                stockitem.part_detail?.image ??
                stockitem?.part_detail?.thumbnail
              }
              pk={stockitem.part}
            />
          </Grid.Col>
          <Grid.Col span={8}>
            <DetailsTable fields={tl} item={stockitem} />
          </Grid.Col>
        </Grid>
        <DetailsTable fields={tr} item={stockitem} />
        <DetailsTable fields={bl} item={stockitem} />
        <DetailsTable fields={br} item={stockitem} />
      </ItemDetailsGrid>
    );
  }, [stockitem, instanceQuery]);

  const stockPanels: PanelType[] = useMemo(() => {
    return [
      {
        name: 'details',
        label: t`Stock Details`,
        icon: <IconInfoCircle />,
        content: detailsPanel
      },
      {
        name: 'tracking',
        label: t`Stock Tracking`,
        icon: <IconHistory />
      },
      {
        name: 'allocations',
        label: t`Allocations`,
        icon: <IconBookmark />,
        hidden:
          !stockitem?.part_detail?.salable && !stockitem?.part_detail?.component
      },
      {
        name: 'testdata',
        label: t`Test Data`,
        icon: <IconChecklist />,
        hidden: !stockitem?.part_detail?.trackable,
        content: stockitem?.pk ? (
          <StockItemTestResultTable
            itemId={stockitem.pk}
            partId={stockitem.part}
          />
        ) : (
          <Skeleton />
        )
      },
      {
        name: 'installed_items',
        label: t`Installed Items`,
        icon: <IconBoxPadding />,
        hidden: !stockitem?.part_detail?.assembly,
        content: <InstalledItemsTable parentId={stockitem.pk} />
      },
      {
        name: 'child_items',
        label: t`Child Items`,
        icon: <IconSitemap />,
        hidden: (stockitem?.child_items ?? 0) == 0,
        content: stockitem?.pk ? (
          <StockItemTable params={{ ancestor: stockitem.pk }} />
        ) : (
          <Skeleton />
        )
      },
      {
        name: 'attachments',
        label: t`Attachments`,
        icon: <IconPaperclip />,
        content: (
          <AttachmentTable
            endpoint={ApiEndpoints.stock_attachment_list}
            model="stock_item"
            pk={Number(id)}
          />
        )
      },
      {
        name: 'notes',
        label: t`Notes`,
        icon: <IconNotes />,
        content: (
          <NotesEditor
            url={apiUrl(ApiEndpoints.stock_item_list, id)}
            data={stockitem.notes ?? ''}
            allowEdit={true}
          />
        )
      }
    ];
  }, [stockitem, id]);

  const breadcrumbs = useMemo(
    () => [
      { name: t`Stock`, url: '/stock' },
      ...(stockitem.location_path ?? []).map((l: any) => ({
        name: l.name,
        url: getDetailUrl(ModelType.stocklocation, l.pk)
      }))
    ],
    [stockitem]
  );

  const editStockItem = useEditStockItem({
    item_id: stockitem.pk,
    callback: () => refreshInstance()
  });

  const stockActionProps: StockOperationProps = useMemo(() => {
    return {
      items: stockitem,
      model: ModelType.stockitem,
      refresh: refreshInstance
    };
  }, [stockitem]);

  const countStockItem = useCountStockItem(stockActionProps);
  const addStockItem = useAddStockItem(stockActionProps);
  const removeStockItem = useRemoveStockItem(stockActionProps);
  const transferStockItem = useTransferStockItem(stockActionProps);

  const stockActions = useMemo(
    () => /* TODO: Disable actions based on user permissions*/ [
      <BarcodeActionDropdown
        actions={[
          ViewBarcodeAction({}),
          LinkBarcodeAction({
            hidden: stockitem?.barcode_hash
          }),
          UnlinkBarcodeAction({
            hidden: !stockitem?.barcode_hash
          })
        ]}
      />,
      <ActionDropdown
        key="operations"
        tooltip={t`Stock Operations`}
        icon={<IconPackages />}
        actions={[
          {
            name: t`Count`,
            tooltip: t`Count stock`,
            icon: (
              <InvenTreeIcon icon="stocktake" iconProps={{ color: 'blue' }} />
            ),
            onClick: () => {
              stockitem.pk && countStockItem.open();
            }
          },
          {
            name: t`Add`,
            tooltip: t`Add stock`,
            icon: <InvenTreeIcon icon="add" iconProps={{ color: 'green' }} />,
            onClick: () => {
              stockitem.pk && addStockItem.open();
            }
          },
          {
            name: t`Remove`,
            tooltip: t`Remove stock`,
            icon: <InvenTreeIcon icon="remove" iconProps={{ color: 'red' }} />,
            onClick: () => {
              stockitem.pk && removeStockItem.open();
            }
          },
          {
            name: t`Transfer`,
            tooltip: t`Transfer stock`,
            icon: (
              <InvenTreeIcon icon="transfer" iconProps={{ color: 'blue' }} />
            ),
            onClick: () => {
              stockitem.pk && transferStockItem.open();
            }
          }
        ]}
      />,
      <ActionDropdown
        key="stock"
        // tooltip={t`Stock Actions`}
        icon={<IconDots />}
        actions={[
          {
            name: t`Duplicate`,
            tooltip: t`Duplicate stock item`,
            icon: <IconCopy />
          },
          EditItemAction({}),
          DeleteItemAction({})
        ]}
      />
    ],
    [id, stockitem, user]
  );

  const stockBadges: ReactNode[] = useMemo(() => {
    return instanceQuery.isLoading
      ? []
      : [
          <DetailsBadge
            color="blue"
            label={t`Serial Number` + `: ${stockitem.serial}`}
            visible={!!stockitem.serial}
          />,
          <DetailsBadge
            color="blue"
            label={t`Quantity` + `: ${stockitem.quantity}`}
            visible={!stockitem.serial}
          />,
          <DetailsBadge
            color="blue"
            label={t`Batch Code` + `: ${stockitem.batch}`}
            visible={!!stockitem.batch}
          />,
          <StatusRenderer
            status={stockitem.status}
            type={ModelType.stockitem}
            options={{ size: 'lg' }}
          />
        ];
  }, [stockitem, instanceQuery]);

  return (
    <Stack>
      <LoadingOverlay visible={instanceQuery.isFetching} />
      <StockLocationTree
        opened={treeOpen}
        onClose={() => setTreeOpen(false)}
        selectedLocation={stockitem?.location}
      />
      <PageDetail
        title={t`Stock Item`}
        subtitle={stockitem.part_detail?.full_name}
        imageUrl={stockitem.part_detail?.thumbnail}
        badges={stockBadges}
        breadcrumbs={breadcrumbs}
        breadcrumbAction={() => {
          setTreeOpen(true);
        }}
        actions={stockActions}
      />
      <PanelGroup pageKey="stockitem" panels={stockPanels} />
      {editStockItem.modal}
      {countStockItem.modal}
      {addStockItem.modal}
      {removeStockItem.modal}
      {transferStockItem.modal}
    </Stack>
  );
}
