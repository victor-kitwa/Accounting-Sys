import { Doc } from 'fyo/model/doc';
import { ListViewSettings } from 'fyo/model/types';
import { PriceListItem } from './PriceListItem';
import {
  getPriceListEnabledColumn,
  getPriceListStatusColumn,
} from 'models/helpers';

export class PriceList extends Doc {
  isEnabled?: boolean;
  isSales?: boolean;
  isPurchase?: boolean;
  priceListItem?: PriceListItem[];

  static getListViewSettings(): ListViewSettings {
    return {
      columns: [
        'name',
        getPriceListEnabledColumn(),
        getPriceListStatusColumn(),
      ],
    };
  }
}
