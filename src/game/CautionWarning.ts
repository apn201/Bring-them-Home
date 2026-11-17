/** Master acknowledgement silences the attention signal, never the fault. */
export class CautionWarning {
 private conditions = new Set<string>();
 master = false;
 set(conditions:readonly string[]): boolean {
  const next=new Set(conditions);
  const raised=conditions.some(condition=>!this.conditions.has(condition));
  if(raised)this.master=true;
  this.conditions=next;
  return raised;
 }
 acknowledge():void {this.master=false;}
 reset():void {this.master=false;this.conditions.clear();}
 has(condition:string):boolean {return this.conditions.has(condition);}
}
