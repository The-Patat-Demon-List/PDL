import { store } from "../main.js";
import { embed } from "../util.js";
import { score } from "../score.js";
import { fetchPacks, fetchPackLevels } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="pack-list">
            <div class="packs-nav">
                <div>
                    <button
                        @click="switchLevels(i)"
                        v-for="(pack, i) in packs"
                        :key="i"
                        :style="{background: pack.colour}"
                        class="type-label-lg"
                    >
                        <p class="tag-btn-txt">{{ pack.name }}</p>
                    </button>
                </div>
            </div>
            <div class="list-container">
                <table class="list" v-if="selectedPackLevels">
                    <tr v-for="(level, i) in selectedPackLevels" :key="i">
                        <td class="rank">
                            <p class="type-label-lg">#{{ i + 1 }}</p>
                        </td>
                        <td
                            class="level"
                            :class="{ active: selectedLevel == i, error: !level }"
                        >
                            <button
                                :style="[
                                    selectedLevel == i
                                        ? {background: pack.colour}
                                        : {},
                                ]"
                                @click="selectedLevel = i"
                            >
                                <span class="type-label-lg tag-btn-txt">{{
                                    level[0].level.name || \`Error (.json)\`
                                }}</span>
                            </button>
                        </td>
                    </tr>
                </table>
            </div>
            <div class="level-container">
                <div class="level" v-if="level">
                    <h1 style="display:flex; align-items:center; gap:8px;">
                        <div style="display:flex; align-items:center; gap:8px; flex:1;">
                            <img :src="getDemonRating()" class="difficultyface" v-if="level && level.difficulty != null"/>
                            <span style="font-weight:600; font-size:1.1em;">{{ level.name }}</span>
                        </div>
                    </h1>
                    <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>

                    <iframe class="video" id="videoframe" :src="video" frameborder="0"></iframe>

                    <div class="tags" v-if="level && level.tags && level.tags.length > 0">
                        <div v-for="tag in level.tags || []" class="tag" :style="{background:tag.color}">
                            <p class="tag-btn-txt">{{tag.name}}</p>
                        </div>
                    </div>

                    <ul class="stats">
                        <li>
                            <div class="type-title-sm">ID</div>
                            <p>{{ level.id }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Patat's Enjoyment</div>
                            <p>{{ level.enjoyment != null ? level.enjoyment + '/10' : 'N/A'}}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Average Enjoyment</div>
                            <p>{{ averageEnjoyment != null ? averageEnjoyment + '/10' : 'N/A' }}</p>
                            <!-- <p>Coming Soon</p> -->
                        </li>
                    </ul>

                    <h2>Records</h2>
                    <p v-if="selected + 1 <= 50"><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                    <p v-else-if="selected +1 <= 100"><strong>100%</strong> or better to qualify</p>
                    <p v-else>This level does not accept new records.</p>

                    <!--Table of records for levels-->
                    <table class="records">
                        <tr v-for="record in level.records" class="record">
                            <td class="percent">
                                <p>{{ record.percent }}%</p>
                            </td>
                            <td class="user">
                                <a :href="record.link" target="_blank" class="type-label-lg">{{ record.user }}</a>
                            </td>
                            <td class="mobile">
                                <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
                            </td>
                            <td class="enjoyment">
                                <p>{{ record.user != 'Patat' ? (record.enjoyment != null ? record.enjoyment + '/10' : '') : (level.enjoyment != null ? level.enjoyment + '/10' : '') }}</p>
                            </td>
                            <!--
                            <td class="hz">
                                <p>{{ record.hz }}Hz</p>
                            </td>
                            -->
                        </tr>
                    </table>

                </div>
                <div v-else class="level" style="height: 100%; justify-content: center; align-items: center;">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                </div>
            </div>
            <div class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors" :key="error">{{ error }}</p>
                    </div>
                    <h3>About the packs</h3>
                    <p>
                        These are list packs all chosen by the staff team that you can beat
                        levels for and get the packs attached to your profile
                    </p>
                    <h3>How can I get these packs?</h3>
                    <p>
                        It's as simple as just beating the levels and getting your records
                        added! The packs will automatically appear on your profile when all
                        levels have been completed
                    </p>
                </div>
            </div>
        </main>
    `,
    data: () => ({
        packs: [],
        errors: [],
        selected: 0,
        selectedLevel: 0,
        selectedPackLevels: [],
        loading: true,
        store,
    }),
    computed: {
        pack() {
            return this.packs[this.selected];
        },
        level() {
            return this.selectedPackLevels[this.selectedLevel][0].level;
        },
        video() {
            if (!this.level.showcase) {
                return embed(this.level.verification);
            }

            return embed(
                this.toggledShowcase
                    ? this.level.showcase
                    : this.level.verification,
            );
        },
        averageEnjoyment() {
            if (!this.level || !this.level.records) return null;

            const values = this.level.records
                .map((r) => {
                    // Use level enjoyment for Patat
                    if (r.user === "Patat") {
                        return this.level.enjoyment;
                    }
                    return r.enjoyment;
                })
                .filter((e) => e != null);

            if (!values.length) return null;

            const avg = values.reduce((a, b) => a + b, 0) / values.length;

            return avg.toFixed(2);
        },
    },
    async mounted() {
        this.packs = await fetchPacks();
        this.selectedPackLevels = await fetchPackLevels(
            this.packs[this.selected].name,
        );

        this.loading = false;
    },
    methods: {
        embed,
        score,
        async switchLevels(i) {
            this.selected = i;
            this.selectedLevel = 0;
            this.selectedPackLevels = await fetchPackLevels(
                this.packs[this.selected].name,
            );
        },
        getDemonRating(){
            const currentLevel = this.level;
            if (!currentLevel || typeof currentLevel.difficulty === 'undefined') {
                return '';
            }
            const difficultyNames = ["Demon0", "Demon1", "Demon2", "Demon3", "Demon4"];
            if (difficultyNames[currentLevel.difficulty] + 1) {
                const name = difficultyNames[currentLevel.difficulty];
                return `/assets/${name}.png`;
            }
            return '';
        },
    },
};
