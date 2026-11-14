import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import {
  CheckCircleFill, WarningFill, CloseCircleFill, InfoCircleFill,
  InboxOutline, DownloadOutline, PlayCircleOutline
} from '@ant-design/icons-angular/icons';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes, withHashLocation()),
    provideNzI18n(en_US),
    provideNzIcons([
      CheckCircleFill, WarningFill, CloseCircleFill, InfoCircleFill,
      InboxOutline, DownloadOutline, PlayCircleOutline
    ])
  ]
};
