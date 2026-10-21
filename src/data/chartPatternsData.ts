export interface ChartPatternItem {
  id: string;
  nameEn: string;
  nameJa: string;
  category: "bullish" | "bearish";
  type: "reversal" | "continuation";
  typeLabel: string;
  description: string;
  marketPsychology: string;
  entryPoint: string;
  stopLoss: string;
  takeProfit: string;
  reliability: number; // 1-5
  frequency: number; // 1-5
  tips: string[];
}

export interface ChartPatternPair {
  id: string;
  bullish: ChartPatternItem;
  bearish: ChartPatternItem;
}

export const chartPatternPairs: ChartPatternPair[] = [
  {
    id: "head-and-shoulders-pair",
    bullish: {
      id: "inverse-head-and-shoulders",
      nameEn: "Head & Shoulders (Bullish Reversal)",
      nameJa: "逆三尊（ヘッド＆ショルダー・ボトム）",
      category: "bullish",
      type: "reversal",
      typeLabel: "Bullish Reversal",
      description: "下降トレンドの終焉を示唆する最も強力な底打ち反転パターン。左肩・頭（最安値）・右肩の3つの谷を形成し、ネックラインを上抜けることで上昇トレンドへ転換します。",
      marketPsychology: "売り方の売り圧力が最安値（頭）を境に弱まり、右肩の押し目が浅くなることで買い方の優勢が明確化。ネックライン突破で売り方の損切り買戻しと新規買いが一気に加速します。",
      entryPoint: "ネックライン（2つの戻り高値を結ぶライン）を上抜けて陽線確定時、またはブレイク後のネックラインへの押し目（リテスト）確認時。",
      stopLoss: "右肩（RS）の安値直下、またはネックラインのわずか下。",
      takeProfit: "頭（最安値）からネックラインまでの垂直距離（値幅H）と等しい幅を、ネックラインから上に加算（E計算値）。",
      reliability: 5,
      frequency: 4,
      tips: [
        "ネックライン突破時に出来高（ボリューム）が急増しているか必ず確認する。",
        "右肩が左肩よりも高い位置にある場合、買い意欲がより強く勝率が高まる。",
        "ブレイク直後に飛びつかず、ネックラインまでのリテスト（プルバック）を待つとリスクリワードが極めて良好になる。"
      ]
    },
    bearish: {
      id: "head-and-shoulders",
      nameEn: "Head & Shoulders (Bearish Reversal)",
      nameJa: "三尊天井（ヘッド＆ショルダー・トップ）",
      category: "bearish",
      type: "reversal",
      typeLabel: "Bearish Reversal",
      description: "上昇トレンドの天井圏で出現する最も有名な反転下落パターン。左肩・頭（最高値）・右肩の3つの山を形成し、ネックラインを下抜けることで下降トレンドへ突入します。",
      marketPsychology: "高値を更新したものの（頭）、その後の買いが続かず右肩が高値を更新できずに失速。買い手の息切れを察知した売り手が一気に売りを浴びせ、ネックライン割れで投げ売りを誘発します。",
      entryPoint: "ネックライン（2つの押し安値を結ぶ支持線）を下抜けて陰線確定時、またはネックラインへの戻り（リテスト）失敗時。",
      stopLoss: "右肩（RS）の高値直上、またはネックラインのわずか上。",
      takeProfit: "頭（最高値）からネックラインまでの垂直距離（値幅H）と等しい幅を、ネックラインから下に減算。",
      reliability: 5,
      frequency: 4,
      tips: [
        "右肩形成時の出来高が、頭（最高値）形成時よりも減少していると天井の信憑性が高い。",
        "ネックラインが右下がりの傾斜になっている場合、売り圧力が非常に強く下落速度が速い。",
        "下抜け後に一度ネックラインまで戻す動き（リテスト）が頻繁に起こるため、戻り売りが最も安全。"
      ]
    }
  },
  {
    id: "inverse-hs-double-top-pair",
    bullish: {
      id: "inverse-hs-variant",
      nameEn: "Inverse Head & Shoulders (Bullish Reversal)",
      nameJa: "逆ヘッド＆ショルダー（三尊底・反転上昇）",
      category: "bullish",
      type: "reversal",
      typeLabel: "Bullish Reversal",
      description: "下落相場の最終局面で底を3回試し、中央の頭が最も深く沈み込む經典的な反転形状。左右対称性が高いほど市場参加者の意識が集中します。",
      marketPsychology: "過度の悲観論の中で頭をつけた後、力強い反発が入り、2回目の押し目（右肩）で売りが枯渇。市場心理が完全な弱気から強気へと反転します。",
      entryPoint: "ネックライン上抜け確定、またはネックラインへのプルバック反発確認時。",
      stopLoss: "直近右肩安値の数pips/ティック下。",
      takeProfit: "底値からネックラインまでの垂直幅（1:1プロジェクション）。",
      reliability: 5,
      frequency: 3,
      tips: [
        "右肩が形成される時間が長すぎないことが理想。",
        "MACDやRSIでの強気ダイバージェンス（逆行現象）が頭と右肩の間で確認できると成功確率が飛躍的に向上する。"
      ]
    },
    bearish: {
      id: "double-top",
      nameEn: "Double Top (Bearish Reversal)",
      nameJa: "ダブルトップ（二重天井・Mトップ）",
      category: "bearish",
      type: "reversal",
      typeLabel: "Bearish Reversal",
      description: "上昇トレンド中にほぼ同水準の高値を2回試して突破に失敗し、M字型を描いてネックラインを下抜ける反転下落パターン。",
      marketPsychology: "1つ目の高値からの押し目を経て再度高値を試すが、前回の高値を超える買いが入らず失速。高値圏での買い手が捕まり、谷（ネックライン）を割り込むことでパニック売りが発生します。",
      entryPoint: "ネックライン（中央の谷の安値）を下抜け確定時、またはネックラインへの戻り確認時。",
      stopLoss: "2つ目の山の高値直上、またはネックライン上。",
      takeProfit: "高値からネックラインまでの垂直距離と同等幅を下方向に展開。",
      reliability: 4,
      frequency: 5,
      tips: [
        "2つ目の山が1つ目の山よりわずかに低く切り下げている場合、下落圧力が強い。",
        "2つ目の山で長い上ヒゲ（ピンバー）が出現した場合は先回り警戒サイン。",
        "ネックラインを割るまでは単なるレンジであるため、フライングでのショートは危険。"
      ]
    }
  },
  {
    id: "double-bottom-top-pair",
    bullish: {
      id: "double-bottom",
      nameEn: "Double Bottom (Bullish Reversal)",
      nameJa: "ダブルボトム（二重底・Wボトム）",
      category: "bullish",
      type: "reversal",
      typeLabel: "Bullish Reversal",
      description: "下降トレンド中にほぼ同水準の安値を2回試して下げ止まり、W字型を描いて中央の戻り高値（ネックライン）を上抜ける反転上昇パターン。",
      marketPsychology: "1つ目の安値からの反発後、再度売り崩しが仕掛けられるも、前回の安値付近で強い買い支えが入り反発。売り手のストップロスを巻き込んで急伸します。",
      entryPoint: "ネックライン（中央の山の高値）をローソク足の実体で上抜けた瞬間、またはリテスト時。",
      stopLoss: "2つ目の底の安値直下、またはネックライン直下。",
      takeProfit: "底値からネックラインまでの垂直値幅をネックラインから上に測定（1:1）。",
      reliability: 4,
      frequency: 5,
      tips: [
        "2番底が1番底よりわずかに切り上がっている（右肩上がり）と上昇モメンタムが極めて強い。",
        "日足や4時間足など上位足で出現したダブルボトムは極めて高い勝率を誇る。",
        "2番底付近でRSIが切り上がっている強気ダイバージェンスが頻出する。"
      ]
    },
    bearish: {
      id: "double-top-variation",
      nameEn: "Double Top (Bearish Reversal)",
      nameJa: "ダブルトップ（高値圏天井・売り転換）",
      category: "bearish",
      type: "reversal",
      typeLabel: "Bearish Reversal",
      description: "レジスタンスラインで2回跳ね返され、買い手の買い上がりが完全に息切れしたことを示す王道の売りパターン。",
      marketPsychology: "「この水準以上は割高だ」という機関投資家・大口の強い利食い売りが壁を作り、個人投資家の買いが吸収された後に下値支持線をブレイクして崩壊します。",
      entryPoint: "中央谷の安値ライン（ネックライン）割り込み時。",
      stopLoss: "トップ高値の直上。",
      takeProfit: "山から谷までの距離と同じ値幅を下落ターゲットとする。",
      reliability: 4,
      frequency: 5,
      tips: [
        "ネックラインブレイク時の陰線が大きく実体が長いほど信頼度が高い。",
        "ネックラインを割った後の最初のリバウンドがネックラインに届かず再下落した時が最高の追撃売り場。"
      ]
    }
  },
  {
    id: "triangles-pair",
    bullish: {
      id: "descending-triangle-bullish",
      nameEn: "Descending Triangle (Bullish Continuation)",
      nameJa: "下降トライアングル（上放れ・上昇継続）",
      category: "bullish",
      type: "continuation",
      typeLabel: "Bullish Continuation",
      description: "上昇トレンドの中休みで、上値が切り下がりながら下値が一定で耐えた後、下降トレンドラインを力強く上放れるパターン。",
      marketPsychology: "一見すると弱気に見える調整局面だが、強力な買い支え（水平サポート）が崩れず、売り手の弾切れに乗じてブレイクアウトが発生します。",
      entryPoint: "切り下がる下降トレンドラインを上抜けて確定した時。",
      stopLoss: "水平サポートラインの直下、または直近の押し安値下。",
      takeProfit: "トライアングルの最も広い高さ（ベース）をブレイクポイントから加算。",
      reliability: 4,
      frequency: 3,
      tips: [
        "上抜けた瞬間よりも、ブレイク後にラインを試して跳ね返るタイミングが狙い目。",
        "もみ合いがトライアングルの先端（頂点）に近づきすぎる前の、全体の3/4あたりでのブレイクが最も伸びやすい。"
      ]
    },
    bearish: {
      id: "ascending-triangle-bearish",
      nameEn: "Ascending Triangle (Bearish Continuation)",
      nameJa: "上昇トライアングル（下放れ・下降継続）",
      category: "bearish",
      type: "continuation",
      typeLabel: "Bearish Continuation",
      description: "下降トレンド中の戻り局面で、安値が切り上がるも水平レジスタンスに阻まれ続け、最終的に下値支持線を下抜けて急落するパターン。",
      marketPsychology: "戻りを試す買い手が粘り強く安値を切り上げるが、戻り売り圧力の壁を破れず力尽き、支持線を割った途端に投げ売りが雪崩を打ちます。",
      entryPoint: "切り上がる上昇サポートラインを下抜け確定時。",
      stopLoss: "水平レジスタンスラインの直上。",
      takeProfit: "トライアングルの最大高さをブレイクポイントから下に投影。",
      reliability: 4,
      frequency: 3,
      tips: [
        "支持線を下抜けた後に急激な陰線連続になりやすい。",
        "移動平均線（25日線や200日線など）が頭上に覆いかぶさっていると成功率アップ。"
      ]
    }
  },
  {
    id: "flags-pair",
    bullish: {
      id: "bullish-flag",
      nameEn: "Bullish Flag (Bullish Continuation)",
      nameJa: "上昇フラッグ（旗型・上昇トレンド継続）",
      category: "bullish",
      type: "continuation",
      typeLabel: "Bullish Continuation",
      description: "急激な上昇（ポール）のあと、わずかに下向きに平行移動する矩形チャネル（旗）を形成し、チャネル上限をブレイクして再急騰する極めて実戦的なパターン。",
      marketPsychology: "急騰後の健全な利食い・調整が小幅な平行チャネルで行われ、売り圧力が弱いことを証明。調整完了とともに新たな買い手が殺到します。",
      entryPoint: "フラッグの上限レジスタンスラインを上抜け確定時。",
      stopLoss: "フラッグ内の最安値直下。",
      takeProfit: "旗竿（ブレイク前の急上昇値幅）と同等の長さをブレイク地点から上に測定（N計算値）。",
      reliability: 5,
      frequency: 5,
      tips: [
        "フラッグ形成中の出来高が減少していることが必須条件（押し目での出来高枯渇）。",
        "フラッグの調整幅が直前のポールの50%以内（できれば38.2%の浅い押し）に収まっているものが最強のシグナル。"
      ]
    },
    bearish: {
      id: "bearish-flag",
      nameEn: "Bearish Flag (Bearish Continuation)",
      nameJa: "下降フラッグ（旗型・下降トレンド継続）",
      category: "bearish",
      type: "continuation",
      typeLabel: "Bearish Continuation",
      description: "急落（ポール）のあと、わずかに右上がりに平行移動するもみ合い（旗）を形成し、下限サポートを割り込んで第二波の下落を起こすパターン。",
      marketPsychology: "急落後の自律反発が極めて弱く、緩やかな上昇チャネルしか作れない買い手の非力さを露呈。下限を割ると次の大きな下落波が襲います。",
      entryPoint: "フラッグの下限サポートラインを下抜け確定時。",
      stopLoss: "フラッグ内の最高値直上。",
      takeProfit: "直前の急落ポールの値幅をブレイク地点から下方向に測定。",
      reliability: 5,
      frequency: 5,
      tips: [
        "反発の勢いが鈍く、ローソク足の実体が小さいジリ高フラッグは下落継続の確実性が高い。",
        "下限ブレイク時に出来高が再膨張していればショートポジションの絶好機。"
      ]
    }
  },
  {
    id: "pennants-pair",
    bullish: {
      id: "bullish-pennant",
      nameEn: "Bullish Pennant (Bullish Continuation)",
      nameJa: "上昇ペナント（三角保ち合い・急騰継続）",
      category: "bullish",
      type: "continuation",
      typeLabel: "Bullish Continuation",
      description: "急上昇（ポール）のあと、高値切り下げ・安値切り上げの小さな対称三角形（ペナント）で急速にエネルギーを凝縮し、上放れるパターン。",
      marketPsychology: "急騰後に値幅が急速に収縮。売買両者の均衡が短期間で極限まで煮詰まり、上昇トレンドの勢いが勝って一気に上方に爆発します。",
      entryPoint: "ペナントの上辺トレンドラインを上抜け確定時。",
      stopLoss: "ペナント内の直近安値直下。",
      takeProfit: "直前のポール（急騰幅）をブレイクアウト地点から上方に投影。",
      reliability: 4,
      frequency: 4,
      tips: [
        "ペナントの形成期間はフラッグよりも短く（通常1〜3週間以内）、素早いブレイクが理想。",
        "保ち合い中央を走る短期移動平均線でサポートされていると強気。"
      ]
    },
    bearish: {
      id: "bearish-pennant",
      nameEn: "Bearish Pennant (Bearish Continuation)",
      nameJa: "下降ペナント（三角保ち合い・急落継続）",
      category: "bearish",
      type: "continuation",
      typeLabel: "Bearish Continuation",
      description: "急落のあと、狭いレンジの対称三角形で値動きが収束し、下辺を割り込んで一段安へと転落する継続パターン。",
      marketPsychology: "急落に驚いた市場が一時停止するも反発する力が皆無で、売り圧力の再点火によって下限を割り込み、買い手のロスカットを誘発します。",
      entryPoint: "ペナントの下辺トレンドラインを下抜け確定時。",
      stopLoss: "ペナント内の直近高値直上。",
      takeProfit: "急落ポールの値幅をブレイク地点から下方に適用。",
      reliability: 4,
      frequency: 4,
      tips: [
        "収縮局面での出来高急減を確認。下抜け時の出来高急増で確信を得る。",
        "直近安値更新とペナント下抜けが重なるポイントは強烈な売りシグナル。"
      ]
    }
  },
  {
    id: "wedges-pair",
    bullish: {
      id: "bullish-wedge",
      nameEn: "Bullish Wedge (Bullish Reversal / Falling Wedge)",
      nameJa: "下降ウェッジ（下向き先細り・反転上昇）",
      category: "bullish",
      type: "reversal",
      typeLabel: "Bullish Reversal",
      description: "高値も安値も切り下げているが、下値の切り下げ幅が上値よりも小さく、下向きに幅が狭まっていく形状。売り圧力が徐々に衰退し、上限を上抜けて一気に反転急騰します。",
      marketPsychology: "安値を更新してはいるものの、下落のモメンタム（勢い）が明らかに衰弱。売り方が疲弊したところで強力な買いが入り、下降トレンドラインを上抜いて逆転します。",
      entryPoint: "ウェッジの上辺レジスタンスラインを力強く上抜け確定時。",
      stopLoss: "ウェッジの最安値直下、または直近の押し安値。",
      takeProfit: "ウェッジの始点（最も幅の広い部分の高値）水準。",
      reliability: 4,
      frequency: 4,
      tips: [
        "オシレーター（RSIやストキャスティクス）での逆行現象（ダイバージェンス）が極めて高頻度で発生する。",
        "ウェッジ先端で値動きが膠着したあとの上放れはトレンド転換の初動となる。"
      ]
    },
    bearish: {
      id: "bearish-wedge",
      nameEn: "Bearish Wedge (Bearish Reversal / Rising Wedge)",
      nameJa: "上昇ウェッジ（上向き先細り・反転急落）",
      category: "bearish",
      type: "reversal",
      typeLabel: "Bearish Reversal",
      description: "高値と安値を切り上げているが、上値の伸びが鈍化し、上向きに幅が狭まっていく形状。買いのエネルギーが枯渇し、下辺を割り込むと一転して急落します。",
      marketPsychology: "高値を更新しているにもかかわらず買いの勢いが細り、無理矢理買われている状態。下値支持線を割り込んだ瞬間に買い手の希望が絶望に変わり、雪崩を打った売りになります。",
      entryPoint: "ウェッジの下辺サポートラインを下抜け確定時。",
      stopLoss: "ウェッジの最高値直上。",
      takeProfit: "ウェッジの始点（最も幅の広い部分の安値）水準。",
      reliability: 4,
      frequency: 4,
      tips: [
        "上昇トレンドの末期だけでなく、下降トレンドの戻り局面でも頻出する警戒パターン。",
        "出来高がウェッジの進行とともに減少していれば、典型的なダマシ上昇の証拠。"
      ]
    }
  },
  {
    id: "rectangles-pair",
    bullish: {
      id: "bullish-rectangle",
      nameEn: "Bullish Rectangle (Bullish Continuation)",
      nameJa: "上昇レクタングル（ボックス・レンジ上放れ）",
      category: "bullish",
      type: "continuation",
      typeLabel: "Bullish Continuation",
      description: "一定の水平サポートとレジスタンスの間で価格が往復するボックス圏相場（保ち合い）を形成後、上限レジスタンスを力強く上抜けて上昇トレンドを再開するパターン。",
      marketPsychology: "買い手と売り手の攻防が一定の価格帯で拮抗。機関投資家がレンジ内でポジションを仕込み終えた後、上限を突破させて相場を次のステージへ引き上げます。",
      entryPoint: "レジスタンスライン（ボックス上限）を終値でブレイク時、またはリテスト時。",
      stopLoss: "ボックスの中央ライン、またはブレイクしたレジスタンスの直下。",
      takeProfit: "ボックスの垂直値幅（上限と下限の差）をブレイク地点から上方に等倍加算。",
      reliability: 4,
      frequency: 5,
      tips: [
        "レンジ内での揉み合い期間が長いほど、ブレイク後のエネルギーが大きく大きく伸びる。",
        "だましブレイク（上ヒゲで戻される）を防ぐため、日足終値での定着を確認することが重要。"
      ]
    },
    bearish: {
      id: "bearish-rectangle",
      nameEn: "Bearish Rectangle (Bearish Continuation)",
      nameJa: "下降レクタングル（ボックス・レンジ下放れ）",
      category: "bearish",
      type: "continuation",
      typeLabel: "Bearish Continuation",
      description: "下降トレンド中に一定の水平バンド内で保ち合いを形成後、下限サポートを割り込んで下降トレンドが再加速するパターン。",
      marketPsychology: "下落相場の中休みとしてレンジが形成されるが、買い手の反撃力が乏しく、大口の売り抜けが完了すると同時にサポートが崩壊して急落します。",
      entryPoint: "サポートライン（ボックス下限）を下抜け確定時。",
      stopLoss: "ボックスの中央値、またはサポートラインの直上。",
      takeProfit: "ボックスの垂直高さと同等の値幅を下方に展開。",
      reliability: 4,
      frequency: 5,
      tips: [
        "下限サポートを何度も叩く（アタックする）ほど支持線が脆くなり、ブレイクが近まる。",
        "サポート割れ後のプルバック（戻り）があれば最高の戻り売りポイントとなる。"
      ]
    }
  },
  {
    id: "triples-pair",
    bullish: {
      id: "triple-bottom",
      nameEn: "Triple Bottom (Bullish Reversal)",
      nameJa: "トリプルボトム（三重底・三尊底変形）",
      category: "bullish",
      type: "reversal",
      typeLabel: "Bullish Reversal",
      description: "ほぼ同一水準の底値を3回試して全て強固に跳ね返され、ネックラインを突破して完全な上昇転換を果たす強力な底入れパターン。",
      marketPsychology: "3回にわたる強力な売り浴びせに対しても岩盤サポートがビクともせず、売り方が完全にギブアップ。ネックライン突破で買い優勢が一気に確定します。",
      entryPoint: "2つの戻り高値を結ぶネックラインを上抜け確定時。",
      stopLoss: "3番目の底の安値直下、またはネックライン下。",
      takeProfit: "底値からネックラインまでの高さをネックラインから上方に適用。",
      reliability: 5,
      frequency: 3,
      tips: [
        "ダブルボトムよりも形成に時間がかかる分、成功した際の上昇トレンドは長期かつ強力。",
        "3つの谷の出来高が徐々に減少し、ネックライン突破時に爆発するのが理想形。"
      ]
    },
    bearish: {
      id: "triple-top",
      nameEn: "Triple Top (Bearish Reversal)",
      nameJa: "トリプルトップ（三重天井・三尊天井変形）",
      category: "bearish",
      type: "reversal",
      typeLabel: "Bearish Reversal",
      description: "ほぼ同一水準の高値を3回試すも全て強烈な売り圧力に押し返され、ネックラインを割り込んで大暴落へと至る天井形成パターン。",
      marketPsychology: "買い方が3度にわたり高値更新を試みるもことごとく叩き落とされ、買い意欲が完全に枯渇。ネックライン割り込みで買い方の総投げが発生します。",
      entryPoint: "2つの押し安値を結ぶネックラインを下抜け確定時。",
      stopLoss: "3番目の山の高値直上、またはネックライン上。",
      takeProfit: "高値からネックラインまでの垂直幅を下方に投影。",
      reliability: 5,
      frequency: 3,
      tips: [
        "3回目のトライで長い上ヒゲが出た時は強力な早期警告シグナル。",
        "ネックラインを割った後の戻りは弱く、そのまま一直線に急落することが多い。"
      ]
    }
  },
  {
    id: "cup-and-handle-pair",
    bullish: {
      id: "cup-and-handle",
      nameEn: "Cup & Handle (Bullish Continuation)",
      nameJa: "カップウィズハンドル（取っ手付きカップ・大化け成長株）",
      category: "bullish",
      type: "continuation",
      typeLabel: "Bullish Continuation",
      description: "ウィリアム・オニール氏が提唱した世界一有名な大化け株パターン。丸みを帯びたお椀型の底（カップ）を作った後、小幅な押し目（ハンドル・取っ手）を形成し、カップ高値をブレイクして大相場へ発展します。",
      marketPsychology: "大口投資家が時間をかけて静かに玉を集め（U字底）、高値手前で最後のふるい落とし（取っ手）を実施。浮動株が完全に吸い上げられた状態で新高値を更新します。",
      entryPoint: "ハンドル（取っ手）の上限レジスタンスライン、またはカップの最高値ピボットポイントを上抜けた瞬間。",
      stopLoss: "ハンドル部分の最安値直下（通常ブレイク価格から5〜8%下）。",
      takeProfit: "カップの底からカップ右側の高値までの深さを、ブレイク地点から上方に測定。",
      reliability: 5,
      frequency: 4,
      tips: [
        "カップの底はV字ではなく、丸みを帯びたU字型（十分な保ち合い期間）が理想。",
        "ハンドル部分の深さは、カップ全体の深さの3分の1以内（浅い押し目）であることが重要。",
        "ブレイクアウト当日の出来高が過去50日平均の40%〜100%以上急増していることが成功の絶対条件。"
      ]
    },
    bearish: {
      id: "inverse-cup-and-handle",
      nameEn: "Inverse Cup & Handle (Bearish Continuation)",
      nameJa: "逆カップウィズハンドル（下落トレンド継続）",
      category: "bearish",
      type: "continuation",
      typeLabel: "Bearish Continuation",
      description: "逆さまのカップ（逆U字・お椀を伏せた形）を作った後、小さな戻り高値（逆ハンドル）を形成し、下限サポートを割り込んで大暴落を再開するパターン。",
      marketPsychology: "天井圏で時間をかけて売り抜けが行われ（逆U字）、弱い自律反発（逆ハンドル）を試すもすぐに買い手が尽きてサポートラインを決壊させます。",
      entryPoint: "逆ハンドルの下限、またはカップ最安値ピボットを下抜けた瞬間。",
      stopLoss: "逆ハンドル部分の最高値直上。",
      takeProfit: "逆カップの頂点から底までの深さを下方に測定。",
      reliability: 4,
      frequency: 3,
      tips: [
        "逆ハンドル形成中に出来高が細り、下抜け時に売り出来高が激増する。",
        "中長期の下落トレンドの初動や中間波で発生すると大幅な下落が期待できる。"
      ]
    }
  }
];
