import { Service, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
  RouterStateSnapshot,
  TitleStrategy,
} from '@angular/router';

// Заголовок вкладки по правилам магазина: «Каталог — Ход конём»
// TODO: класс ShopTitleStrategy, наследник TitleStrategy, с методом updateTitle
