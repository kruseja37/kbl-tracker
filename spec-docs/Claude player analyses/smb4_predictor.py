def predict_grade(POW=0, CON=0, SPD=0, FLD=0, ARM=0, VEL=0, JNK=0, ACC=0, **kwargs):
    # kwargs should contain one-hot encoded boolean flags (e.g., P_Pos_SP=True)
    grade = 30.474957221518764
    grade += 0.009422224772538497 * Age
    grade += 0.17904268572788234 * POW
    grade += 0.2008261385741621 * CON
    grade += 0.11331130797251232 * SPD
    grade += 0.049014682911302954 * FLD
    grade += 0.06617331373296809 * ARM
    grade += 0.265795230127869 * VEL
    grade += 0.2892413197946465 * JNK
    grade += 0.2939327845268552 * ACC
    if kwargs.get('Gender_M', False):
        grade += -0.17918928418456198
    if kwargs.get('P_Pos_2B', False):
        grade += -0.3753122472338244
    if kwargs.get('P_Pos_3B', False):
        grade += -0.4292345894813798
    if kwargs.get('P_Pos_C', False):
        grade += 1.2950694101127471
    if kwargs.get('P_Pos_CF', False):
        grade += 1.2645010810670385
    if kwargs.get('P_Pos_CP', False):
        grade += -17.824598720228668
    if kwargs.get('P_Pos_LF', False):
        grade += -2.2979931060614134
    if kwargs.get('P_Pos_RF', False):
        grade += -0.8971036239247181
    if kwargs.get('P_Pos_RP', False):
        grade += -17.503800138054707
    if kwargs.get('P_Pos_SP', False):
        grade += -20.72206597602817
    if kwargs.get('P_Pos_SP/RP', False):
        grade += -19.00736621482685
    if kwargs.get('P_Pos_SS', False):
        grade += 1.6794820495223046
    if kwargs.get('S_Pos_1B', False):
        grade += 0.19451368655324908
    if kwargs.get('S_Pos_1B/OF', False):
        grade += 1.1909431625891522
    if kwargs.get('S_Pos_2B', False):
        grade += 2.3416130796604584
    if kwargs.get('S_Pos_3B', False):
        grade += 0.47242613219549157
    if kwargs.get('S_Pos_C', False):
        grade += 1.859586673946925
    if kwargs.get('S_Pos_IF', False):
        grade += 0.3424510538553007
    if kwargs.get('S_Pos_IF/OF', False):
        grade += 0.8234693476578889
    if kwargs.get('S_Pos_LF', False):
        grade += 2.022276193503937
    if kwargs.get('S_Pos_OF', False):
        grade += 1.8188615266053716
    if kwargs.get('S_Pos_RF', False):
        grade += 1.3850684410907865
    if kwargs.get('S_Pos_SS', False):
        grade += 2.9038915210733336
    if kwargs.get('Bat_R', False):
        grade += -2.14065710470658
    if kwargs.get('Bat_S', False):
        grade += 3.0251311238281278
    if kwargs.get('Thr_R', False):
        grade += 0.7556975272456885
    if kwargs.get('Chem_Crafty', False):
        grade += 0.062335520480695905
    if kwargs.get('Chem_Disciplined', False):
        grade += 0.6496370260233526
    if kwargs.get('Chem_Scholarly', False):
        grade += 0.26696948070513393
    if kwargs.get('Chem_Spirited', False):
        grade += -0.4240665858402366
    if kwargs.get('Arsenal_str_2F|CF|CB|SL', False):
        grade += 8.053312856429297
    if kwargs.get('Arsenal_str_2F|SB', False):
        grade += -1.962423847948545
    if kwargs.get('Arsenal_str_4F|2F|CB', False):
        grade += -0.7789421051460665
    if kwargs.get('Arsenal_str_4F|2F|CB|CH', False):
        grade += -0.979200635782689
    if kwargs.get('Arsenal_str_4F|2F|CB|CH|FK', False):
        grade += 2.518929388871321
    if kwargs.get('Arsenal_str_4F|2F|CB|FK', False):
        grade += -0.3295663383472237
    if kwargs.get('Arsenal_str_4F|2F|CB|SB', False):
        grade += -2.5794899630199772
    if kwargs.get('Arsenal_str_4F|2F|CB|SL', False):
        grade += -3.0161585857152287
    if kwargs.get('Arsenal_str_4F|2F|CB|SL|CH', False):
        grade += -1.013216559098277
    if kwargs.get('Arsenal_str_4F|2F|CB|SL|FK', False):
        grade += -3.938379229899904
    if kwargs.get('Arsenal_str_4F|2F|CF|CB', False):
        grade += -3.920865786383513
    if kwargs.get('Arsenal_str_4F|2F|CF|CB|SL', False):
        grade += -1.8868906358746653
    if kwargs.get('Arsenal_str_4F|2F|CF|SL', False):
        grade += 3.7847857852555977
    if kwargs.get('Arsenal_str_4F|2F|CF|SL|CH', False):
        grade += 1.2754616219917958
    if kwargs.get('Arsenal_str_4F|2F|CH', False):
        grade += -3.0377375608379613
    if kwargs.get('Arsenal_str_4F|2F|FK', False):
        grade += 6.281905670179297
    if kwargs.get('Arsenal_str_4F|2F|SB|CH', False):
        grade += 1.0096026279504817
    if kwargs.get('Arsenal_str_4F|2F|SL', False):
        grade += -3.812332025004446
    if kwargs.get('Arsenal_str_4F|2F|SL|CH', False):
        grade += -3.2409209792426763
    if kwargs.get('Arsenal_str_4F|2F|SL|CH|FK', False):
        grade += 4.982780492279352
    if kwargs.get('Arsenal_str_4F|2F|SL|FK', False):
        grade += -6.261954691628207
    if kwargs.get('Arsenal_str_4F|2F|SL|SB|CH', False):
        grade += -1.8954558842247138
    if kwargs.get('Arsenal_str_4F|CB', False):
        grade += -3.5756481913375606
    if kwargs.get('Arsenal_str_4F|CB|CH', False):
        grade += -2.8687821376466953
    if kwargs.get('Arsenal_str_4F|CB|CH|FK', False):
        grade += 2.847524364952755
    if kwargs.get('Arsenal_str_4F|CB|FK', False):
        grade += 4.351205040510641
    if kwargs.get('Arsenal_str_4F|CB|SB', False):
        grade += -2.156895500500319
    if kwargs.get('Arsenal_str_4F|CB|SL', False):
        grade += -5.7851680183339695
    if kwargs.get('Arsenal_str_4F|CB|SL|CH', False):
        grade += -1.854894077244171
    if kwargs.get('Arsenal_str_4F|CB|SL|CH|FK', False):
        grade += 1.737266086537022
    if kwargs.get('Arsenal_str_4F|CB|SL|FK', False):
        grade += -0.5604003229205833
    if kwargs.get('Arsenal_str_4F|CB|SL|SB', False):
        grade += -0.12743571134352205
    if kwargs.get('Arsenal_str_4F|CB|SL|SB|CH', False):
        grade += -1.3766185108543085
    if kwargs.get('Arsenal_str_4F|CF|CB', False):
        grade += -3.2451944345091253
    if kwargs.get('Arsenal_str_4F|CF|CB|CH', False):
        grade += -2.0665722330821126
    if kwargs.get('Arsenal_str_4F|CF|CB|FK', False):
        grade += -0.9316246108845063
    if kwargs.get('Arsenal_str_4F|CF|CB|SL', False):
        grade += -0.8054743752258688
    if kwargs.get('Arsenal_str_4F|CF|CB|SL|CH', False):
        grade += -1.948402760168079
    if kwargs.get('Arsenal_str_4F|CF|CH', False):
        grade += 0.7269117341012649
    if kwargs.get('Arsenal_str_4F|CF|CH|FK', False):
        grade += -7.665953236685983
    if kwargs.get('Arsenal_str_4F|CF|SL', False):
        grade += -3.9784568944338323
    if kwargs.get('Arsenal_str_4F|CF|SL|CH', False):
        grade += -2.778534966931855
    if kwargs.get('Arsenal_str_4F|CH', False):
        grade += -3.7842071243675406
    if kwargs.get('Arsenal_str_4F|SB|CH|FK', False):
        grade += -0.26038060188269707
    if kwargs.get('Arsenal_str_4F|SL', False):
        grade += -2.714694470148126
    if kwargs.get('Arsenal_str_4F|SL|CH', False):
        grade += -3.1074643505612887
    if kwargs.get('Arsenal_str_4F|SL|CH|FK', False):
        grade += -3.7058407730971683
    if kwargs.get('Arsenal_str_4F|SL|SB|CH', False):
        grade += -6.984384879952502
    if kwargs.get('Arsenal_str_CF|CB|SL|CH', False):
        grade += -5.331285403321765
    if kwargs.get('Arsenal_str_CF|CB|SL|SB', False):
        grade += -6.359668304609208
    if kwargs.get('Trait1_Ace Exterminator', False):
        grade += -0.42696558070563917
    if kwargs.get('Trait1_BB Prone', False):
        grade += -1.2629000760297144
    if kwargs.get('Trait1_Bad Ball Hitter', False):
        grade += 2.280344698236296
    if kwargs.get('Trait1_Bad Jumps', False):
        grade += 1.6855347007658235
    if kwargs.get('Trait1_Base Jogger', False):
        grade += 1.0887715813399934
    if kwargs.get('Trait1_Base Rounder', False):
        grade += -2.1188338992579303
    if kwargs.get('Trait1_Big Hack', False):
        grade += -0.31532534715878224
    if kwargs.get('Trait1_Bunter', False):
        grade += -1.474720456083485
    if kwargs.get('Trait1_Butter Fingers', False):
        grade += 0.40981127984356114
    if kwargs.get('Trait1_CON vs LHP', False):
        grade += 1.0544445825491209
    if kwargs.get('Trait1_CON vs RHP', False):
        grade += 0.9004821093223956
    if kwargs.get('Trait1_Cannon Arm', False):
        grade += 1.1070103574343801
    if kwargs.get('Trait1_Choker', False):
        grade += 0.8841354907347841
    if kwargs.get('Trait1_Clutch', False):
        grade += 0.525475747369653
    if kwargs.get('Trait1_Composed', False):
        grade += -2.6178137251211933
    if kwargs.get('Trait1_Consistent', False):
        grade += 1.490236095028384
    if kwargs.get('Trait1_Crossed Up', False):
        grade += 1.3152955207923573
    if kwargs.get('Trait1_Distractor', False):
        grade += -0.39501848354906405
    if kwargs.get('Trait1_Dive Wizard', False):
        grade += 0.06445795604344084
    if kwargs.get('Trait1_Durable', False):
        grade += -1.952599487875756
    if kwargs.get('Trait1_Easy Jumps', False):
        grade += -5.513480779201194
    if kwargs.get('Trait1_Easy Target', False):
        grade += -2.4031687188104884
    if kwargs.get('Trait1_Elite 2F', False):
        grade += -1.7585681553647756
    if kwargs.get('Trait1_Elite 4F', False):
        grade += 1.2799961290563764
    if kwargs.get('Trait1_Elite CB', False):
        grade += 1.3650453826707518
    if kwargs.get('Trait1_Elite CF', False):
        grade += 1.6384782203427566
    if kwargs.get('Trait1_Elite CH', False):
        grade += 1.9705731115938687
    if kwargs.get('Trait1_Elite FK', False):
        grade += 0.6743821088891613
    if kwargs.get('Trait1_Elite SB', False):
        grade += 1.1899935054302584
    if kwargs.get('Trait1_Elite SL', False):
        grade += 2.4875779092154433
    if kwargs.get('Trait1_Falls Behind', False):
        grade += -5.148494756430538
    if kwargs.get('Trait1_Fastball Hitter', False):
        grade += 2.271024518829281
    if kwargs.get('Trait1_First Pitch Prayer', False):
        grade += 0.3199397321962434
    if kwargs.get('Trait1_First Pitch Slayer', False):
        grade += 1.7058977537123108
    if kwargs.get('Trait1_Gets Ahead', False):
        grade += 2.580871043445681
    if kwargs.get('Trait1_High Pitch', False):
        grade += 7.266550744065562
    if kwargs.get('Trait1_Injury Prone', False):
        grade += -1.135970259547721
    if kwargs.get('Trait1_Inside Pitch', False):
        grade += 3.419209197770267
    if kwargs.get('Trait1_K Collector', False):
        grade += 3.8127882292940942
    if kwargs.get('Trait1_K Neglecter', False):
        grade += -3.249519740989712
    if kwargs.get('Trait1_Little Hack', False):
        grade += 0.5434425311484707
    if kwargs.get('Trait1_Low Pitch', False):
        grade += 4.8332802449945635
    if kwargs.get('Trait1_Magic Hands', False):
        grade += 1.0230957673870678
    if kwargs.get('Trait1_Meltdown', False):
        grade += -2.0788871758289718
    if kwargs.get('Trait1_Metal Head', False):
        grade += -4.409686497765677
    if kwargs.get('Trait1_Mind Gamer', False):
        grade += 2.9658162050969237
    if kwargs.get('Trait1_Noodle Arm', False):
        grade += -0.6991117558952504
    if kwargs.get('Trait1_Off-speed Hitter', False):
        grade += 6.548657431955197
    if kwargs.get('Trait1_Outside Pitch', False):
        grade += 2.876748638729202
    if kwargs.get('Trait1_POW vs LHP', False):
        grade += -2.584993900629467
    if kwargs.get('Trait1_POW vs RHP', False):
        grade += 2.5134994826599173
    if kwargs.get('Trait1_PWR vs RHP', False):
        grade += 4.623104463230678
    if kwargs.get('Trait1_Pick Officer', False):
        grade += 3.6653784120928465
    if kwargs.get('Trait1_Pinch Perfect', False):
        grade += -2.03360558757287
    if kwargs.get('Trait1_RBI Hero', False):
        grade += 0.06660008822535435
    if kwargs.get('Trait1_RBI Zero', False):
        grade += -1.348377491416955
    if kwargs.get('Trait1_Rally Starter', False):
        grade += 2.130718910713113
    if kwargs.get('Trait1_Rally Stopper', False):
        grade += -1.6327791879084348
    if kwargs.get('Trait1_Reverse Splits', False):
        grade += 2.092701462747679
    if kwargs.get('Trait1_Sign Stealer', False):
        grade += -0.9806018087542191
    if kwargs.get('Trait1_Slow Poke', False):
        grade += 0.792290310147757
    if kwargs.get('Trait1_Specialist', False):
        grade += 4.534380084706064
    if kwargs.get('Trait1_Sprinter', False):
        grade += 0.41739934966441483
    if kwargs.get('Trait1_Stealer', False):
        grade += -0.11616269183697381
    if kwargs.get('Trait1_Stimulated', False):
        grade += 0.6085895115539595
    if kwargs.get('Trait1_Surrounded', False):
        grade += -3.397495123367738
    if kwargs.get('Trait1_Tough Out', False):
        grade += 3.4846456507152985
    if kwargs.get('Trait1_Utility', False):
        grade += 1.3357470261787594
    if kwargs.get('Trait1_Volatile', False):
        grade += 0.660378879860372
    if kwargs.get('Trait1_Whiffer', False):
        grade += -0.7870199156624611
    if kwargs.get('Trait1_Wild Thing', False):
        grade += -2.597577854139606
    if kwargs.get('Trait1_Wild Thrower', False):
        grade += -0.5330427041193242
    if kwargs.get('Trait1_Workhorse', False):
        grade += 2.104242196821571
    if kwargs.get('Trait2_Ace Exterminator', False):
        grade += 6.107281378725473
    if kwargs.get('Trait2_Bad Ball Hitter', False):
        grade += 5.03161774215719
    if kwargs.get('Trait2_Base Rounder', False):
        grade += -0.33144841542631376
    if kwargs.get('Trait2_Big Hack', False):
        grade += 1.7728748002402939
    if kwargs.get('Trait2_Bunter', False):
        grade += 4.468458708367273
    if kwargs.get('Trait2_Butter Fingers', False):
        grade += 0.7122147696613137
    if kwargs.get('Trait2_CON vs LHP', False):
        grade += 4.284680973467719
    if kwargs.get('Trait2_CON vs RHP', False):
        grade += 5.35930522848466
    if kwargs.get('Trait2_Cannon Arm', False):
        grade += 1.3696822582898758
    if kwargs.get('Trait2_Choker', False):
        grade += -6.3596683046092
    if kwargs.get('Trait2_Clutch', False):
        grade += 3.443229937288153
    if kwargs.get('Trait2_Consistent', False):
        grade += 5.428597091295388
    if kwargs.get('Trait2_Dive Wizard', False):
        grade += 1.8606463553119457
    if kwargs.get('Trait2_Durable', False):
        grade += 2.6838394426870402
    if kwargs.get('Trait2_Easy Jumps', False):
        grade += -4.762197894653141
    if kwargs.get('Trait2_Easy Target', False):
        grade += -9.484846359256224
    if kwargs.get('Trait2_Elite 2F', False):
        grade += -1.9624238479485467
    if kwargs.get('Trait2_Elite 4', False):
        grade += 1.0096026279505037
    if kwargs.get('Trait2_Elite 4F', False):
        grade += 1.5192118002114627
    if kwargs.get('Trait2_Elite CB', False):
        grade += -2.5346377945273755
    if kwargs.get('Trait2_Elite CF', False):
        grade += 2.4729211729447713
    if kwargs.get('Trait2_Elite CH', False):
        grade += 7.999873502490673
    if kwargs.get('Trait2_Elite FK', False):
        grade += 2.5189293888713156
    if kwargs.get('Trait2_Elite SL', False):
        grade += 3.1212554783575506
    if kwargs.get('Trait2_Fastball Hitter', False):
        grade += 8.381490522088614
    if kwargs.get('Trait2_First Pitch Slayer', False):
        grade += 1.0896207044580983
    if kwargs.get('Trait2_Gets Ahead', False):
        grade += 5.974095588060707
    if kwargs.get('Trait2_High Pitch', False):
        grade += 7.675500187195478
    if kwargs.get('Trait2_Injury Prone', False):
        grade += -0.26038060188275214
    if kwargs.get('Trait2_Inside Pitch', False):
        grade += -1.584469741390194
    if kwargs.get('Trait2_Little Hack', False):
        grade += -0.30836127716188855
    if kwargs.get('Trait2_Low Pitch', False):
        grade += 4.024412851905935
    if kwargs.get('Trait2_Magic Hands', False):
        grade += 0.23097115824046144
    if kwargs.get('Trait2_Meltdown', False):
        grade += -6.934961088164579
    if kwargs.get('Trait2_Metal Head', False):
        grade += 7.351188490960643
    if kwargs.get('Trait2_Mind Gamer', False):
        grade += -0.011565116205087822
    if kwargs.get('Trait2_Noodle Arm', False):
        grade += 0.868536090425027
    if kwargs.get('Trait2_Off-speed Hitter', False):
        grade += 6.77692321435467
    if kwargs.get('Trait2_Outside Pitch', False):
        grade += 4.171445603291862
    if kwargs.get('Trait2_Pick Officer', False):
        grade += 5.643649366064832
    if kwargs.get('Trait2_Rally Starter', False):
        grade += 4.600871116562436
    if kwargs.get('Trait2_Rally Stopper', False):
        grade += 3.3609784493307573
    if kwargs.get('Trait2_Sign Stealer', False):
        grade += 1.5244942583521928
    if kwargs.get('Trait2_Slow Poke', False):
        grade += -2.9686951114922686
    if kwargs.get('Trait2_Sprinter', False):
        grade += 4.03800214437342
    if kwargs.get('Trait2_Stealer', False):
        grade += 4.156553450164452
    if kwargs.get('Trait2_Stimulated', False):
        grade += 0.3868334954436423
    if kwargs.get('Trait2_Surrounded', False):
        grade += 2.5916328188565676
    if kwargs.get('Trait2_Two Way (IF)', False):
        grade += -17.420901980964874
    if kwargs.get('Trait2_Utility', False):
        grade += 2.1477561913897776
    if kwargs.get('Trait2_Volatile', False):
        grade += 2.8749465277548873
    if kwargs.get('Trait2_Wild Thing', False):
        grade += -3.0250676650124126
    if kwargs.get('Trait2_Wild Thrower', False):
        grade += -2.1523577523899773
    if kwargs.get('Trait2_Workhorse', False):
        grade += 9.190090582596536
    return round(grade)
