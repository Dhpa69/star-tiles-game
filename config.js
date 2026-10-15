// v45 app config. All values here are public. Replace the AdMob TEST ids with real ones before release (see MONEY-STEPS.md).
window.ST_CONFIG={
 supportEmail:'dhpa69@yahoo.com',
 supabaseUrl:'https://etfhuwopqjderqutlyhk.supabase.co',
 supabaseAnon:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0Zmh1d29wcWpkZXJxdXRseWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5ODY4NjAsImV4cCI6MjEwNzU2Mjg2MH0.nVq3VqCYn3fRByCUle0u8_4almvp31oafR4LaHrE7TA',
 vapidPublic:'BI2VyK1_Wkn7p1AbJBNKoEYv7v7SsnVA9eQkk0XozvSnCDWg2Ty5o7cS6n_1Q2OM1TOfZD3LjPZw4f9-UPwfwVE',
 appStoreUrl:'https://apps.apple.com/app/id6822896769',
 iap:[
  {id:'com.dhavalpatel.startiles.coins500',  coins:500,   price:'$0.99'},
  {id:'com.dhavalpatel.startiles.coins1500', coins:1500,  price:'$2.99'},
  {id:'com.dhavalpatel.startiles.coins3500', coins:3500,  price:'$4.99'},
  {id:'com.dhavalpatel.startiles.coins8000', coins:8000,  price:'$9.99', tag:'BEST VALUE'},
  {id:'com.dhavalpatel.startiles.coins20000',coins:20000, price:'$19.99'},
  {id:'com.dhavalpatel.startiles.removeads', noAds:true, price:'$2.99', nonConsumable:true, title:'Remove Ads'},
  {id:'com.dhavalpatel.startiles.pro', noAds:true, coins:2000, price:'$4.99', nonConsumable:true, title:'Star Tiles Pro', note:'No ads + 2,000 coins'}],
 admob:{ // Google TEST ids – safe to ship in TestFlight, replace for App Store
  appId:'ca-app-pub-3940256099942544~1458002511',
  interstitial:'ca-app-pub-3940256099942544/4411468910',
  rewarded:'ca-app-pub-3940256099942544/1712485313',
  testing:true, rewardCoins:25, rewardPerDay:5, minGapSec:120}
};
window.ST_LAUNCH=location.search; // v53: keep invite params before the room-link handler clears the URL
