import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

export const route: Route = {
    path: '/message',
    categories: ['university'],
    example: '/hit-career/message',
    parameters: { },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: '就业信息',
    maintainers: ['Mayohoshi'],
    handler,
};

async function handler(ctx) {
    const host = 'https://career.hit.edu.cn/';
    const link = `${host}/zhxy-xszyfzpt/zpxx/zpxx4?xxrq=2025-02-28&xxfl=3&ztlx=`;

    const response = await got(link);
    const $ = load(response.data);

    const lists = $('div.f-right.bd li')
        .toArray()
        .map((el) => ({
            title: $('span.cont', el).text().trim(),
            link: `${host}${$('a', el).attr('onclick').match(/goZpxxXq\('(.+?)'\)/)[1]}`,
            deadline: $('p.shijian', el).text().replace('截止时间：', '').trim(),
            pubDate: timezone(parseDate($('span.date', el).text()), 8),
            education: $('p.xueli', el).text().trim(), // 添加学历信息
        }));

    const items = await Promise.all(
        lists.map((item) =>
            cache.tryGet(item.link, async () => {
                const response = await got.get(item.link);
                const $ = load(response.data);
                item.description = $('div.edittext').html().trim();
                item.pubDate = timezone(parseDate($('.item').first().text().replace('发布时间：', '')), 8);
                return item;
            })
        )
    );

    return {
        title: '哈工大就业网招聘信息',
        link,
        item: items,
    };
}
