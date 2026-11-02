import { Component } from '@angular/core';

// Страница /wishlist?ids=3,7,12: список желаний по ссылке. Открывается без входа
@Component({
  selector: 'app-wishlist-page',
  templateUrl: './wishlist-page.html',
})
export class WishlistPage {
  // TODO: id игр — из параметра адреса ?ids=; игры — загрузить по списку id
}
