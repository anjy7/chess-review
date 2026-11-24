// Display original PGN metadata, never the review job ID or save time.
export function gameDetails(headers:Record<string,string>){
 let id:string|undefined;
 for(const link of [headers.Link,headers.Site]){
  try{const url=new URL(link);if(url.protocol==='https:'&&['chess.com','www.chess.com'].includes(url.hostname)){const match=/^\/(?:analysis\/)?game\/(?:live|daily)\/(\d+)(?:\/|$)/.exec(url.pathname);if(match){id=match[1];break;}}}catch{}
 }
 const date=(s:string|undefined)=>{if(!s||!/^\d{4}\.\d{2}\.\d{2}$/.test(s))return;const iso=s.replaceAll('.','-'),value=new Date(iso+'T00:00:00Z');return Number.isFinite(value.getTime())&&value.toISOString().slice(0,10)===iso?iso:undefined;};
 const time=(s:string|undefined)=>s&&/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(s)?s:undefined;
 const utcDate=date(headers.UTCDate),utcTime=time(headers.UTCTime),localDate=date(headers.Date),localTime=time(headers.StartTime)||time(headers.Time);
 const timeLabel=utcDate&&utcTime?`${utcDate} · ${utcTime} UTC`:
  localDate&&localTime?`${localDate} · ${localTime} ${headers.Timezone||'(timezone unspecified)'}`:
  (utcDate||localDate)?`${utcDate||localDate} · Time unavailable`:'Game time unavailable';
 return {id,timeLabel};
}
